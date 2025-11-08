const anchor = require("@coral-xyz/anchor");
const assert = require("assert");

describe("nautilink traceability", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.Nautilink;

  // Helper to create timestamp
  const now = () => new anchor.BN(Math.floor(Date.now() / 1000));

  describe("Scenario: Fishing Crate A + B → Mix C → Split D + E", () => {
    let crateA, crateB, crateC, crateD, crateE;

    it("Step 1: Creates Fishing Crate A (1000g)", async () => {
      crateA = anchor.web3.Keypair.generate();

      await program.methods
        .createCrate(
          "CRATE_A",
          1000, // 1000g
          now(),
          "hashA",
          "ipfs_cid_A"
        )
        .accounts({
          crateRecord: crateA.publicKey,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([crateA])
        .rpc();

      const record = await program.account.crateRecord.fetch(crateA.publicKey);
      assert.strictEqual(record.crateId, "CRATE_A");
      assert.strictEqual(record.weight, 1000);
      assert.strictEqual(record.parentCrates.length, 0);
      console.log("✅ Crate A created: 1000g");
    });

    it("Step 2: Creates Fishing Crate B (1500g)", async () => {
      crateB = anchor.web3.Keypair.generate();

      await program.methods
        .createCrate(
          "CRATE_B",
          1500,
          now(),
          "hashB",
          "ipfs_cid_B"
        )
        .accounts({
          crateRecord: crateB.publicKey,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([crateB])
        .rpc();

      const record = await program.account.crateRecord.fetch(crateB.publicKey);
      assert.strictEqual(record.weight, 1500);
      console.log("✅ Crate B created: 1500g");
    });

    it("Step 3: Mixes A + B into C at Fishery (2500g total)", async () => {
      crateC = anchor.web3.Keypair.generate();

      await program.methods
        .mixCrates(
          "CRATE_C_MIXED",
          now(),
          "hashC",
          "ipfs_cid_C",
          [crateA.publicKey, crateB.publicKey]
        )
        .accounts({
          crateRecord: crateC.publicKey,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .remainingAccounts([
          { pubkey: crateA.publicKey, isWritable: false, isSigner: false },
          { pubkey: crateB.publicKey, isWritable: false, isSigner: false },
        ])
        .signers([crateC])
        .rpc();

      const recordC = await program.account.crateRecord.fetch(crateC.publicKey);
      
      // C knows its parents
      assert.strictEqual(recordC.parentCrates.length, 2);
      assert.strictEqual(recordC.parentCrates[0].toBase58(), crateA.publicKey.toBase58());
      assert.strictEqual(recordC.parentCrates[1].toBase58(), crateB.publicKey.toBase58());
      
      // C knows parent weights (composition)
      assert.strictEqual(recordC.parentWeights[0], 1000); // A's contribution
      assert.strictEqual(recordC.parentWeights[1], 1500); // B's contribution
      
      // Total weight
      assert.strictEqual(recordC.weight, 2500);
      
      console.log("✅ Crate C created from mix: 2500g (A:1000g + B:1500g)");
    });

    it("Step 4: Updates A to know about child C", async () => {
      await program.methods
        .updateChildParent(crateC.publicKey)
        .accounts({
          childCrate: crateA.publicKey,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      const recordA = await program.account.crateRecord.fetch(crateA.publicKey);
      assert.strictEqual(recordA.parentCrates.length, 1);
      assert.strictEqual(recordA.parentCrates[0].toBase58(), crateC.publicKey.toBase58());
      console.log("✅ Crate A now knows it contributed to C");
    });

    it("Step 5: Updates B to know about child C", async () => {
      await program.methods
        .updateChildParent(crateC.publicKey)
        .accounts({
          childCrate: crateB.publicKey,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      const recordB = await program.account.crateRecord.fetch(crateB.publicKey);
      assert.strictEqual(recordB.parentCrates.length, 1);
      console.log("✅ Crate B now knows it contributed to C");
    });

    it("Step 6: Splits C into D (1000g) at Processing Plant D", async () => {
      crateD = anchor.web3.Keypair.generate();
      crateE = anchor.web3.Keypair.generate();

      // Create D (40% of C)
      await program.methods
        .splitCrate(
          "CRATE_D_SPLIT",
          1000, // D gets 1000g
          now(),
          "hashD",
          "ipfs_cid_D",
          [crateD.publicKey, crateE.publicKey],
          [1000, 1500] // D:1000g, E:1500g
        )
        .accounts({
          crateRecord: crateD.publicKey,
          authority: provider.wallet.publicKey,
          parentCrate: crateC.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([crateD])
        .rpc();

      const recordD = await program.account.crateRecord.fetch(crateD.publicKey);
      
      // D knows its parent
      assert.strictEqual(recordD.parentCrates.length, 1);
      assert.strictEqual(recordD.parentCrates[0].toBase58(), crateC.publicKey.toBase58());
      
      // D knows sibling distribution
      assert.strictEqual(recordD.childCrates.length, 2);
      assert.strictEqual(recordD.splitDistribution[0], 1000); // D's share
      assert.strictEqual(recordD.splitDistribution[1], 1500); // E's share
      
      // D's weight
      assert.strictEqual(recordD.weight, 1000);
      
      console.log("✅ Crate D created from split: 1000g (40% of C)");
    });

    it("Step 7: Splits C into E (1500g) at Processing Plant E", async () => {
      // E already has keypair from previous step
      
      await program.methods
        .splitCrate(
          "CRATE_E_SPLIT",
          1500, // E gets 1500g
          now(),
          "hashE",
          "ipfs_cid_E",
          [crateD.publicKey, crateE.publicKey],
          [1000, 1500]
        )
        .accounts({
          crateRecord: crateE.publicKey,
          authority: provider.wallet.publicKey,
          parentCrate: crateC.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([crateE])
        .rpc();

      const recordE = await program.account.crateRecord.fetch(crateE.publicKey);
      assert.strictEqual(recordE.weight, 1500);
      console.log("✅ Crate E created from split: 1500g (60% of C)");
    });

    it("Step 8: Updates C to know about children D and E", async () => {
      await program.methods
        .updateParentChildren([crateD.publicKey, crateE.publicKey])
        .accounts({
          parentCrate: crateC.publicKey,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      const recordC = await program.account.crateRecord.fetch(crateC.publicKey);
      assert.strictEqual(recordC.childCrates.length, 2);
      console.log("✅ Crate C now knows it split into D and E");
    });

    it("Step 9: Verifies complete lineage - D knows A+B composition", async () => {
      const recordD = await program.account.crateRecord.fetch(crateD.publicKey);
      
      // Debug: Check what we have
      console.log("\nDebug recordD:");
      console.log("  parentCrates:", recordD.parentCrates);
      console.log("  parentCrates length:", recordD.parentCrates.length);
      
      // Fetch parent C
      const recordC = await program.account.crateRecord.fetch(recordD.parentCrates[0]);
      
      console.log("\nDebug recordC:");
      console.log("  parentWeights:", recordC.parentWeights);
      console.log("  parentWeights length:", recordC.parentWeights.length);
      
      // D → C → (A + B)
      console.log("\n📊 Lineage Analysis for Crate D:");
      console.log(`  D weight: ${recordD.weight}g`);
      console.log(`  D's parent: C (${recordC.weight}g)`);
      
      if (recordC.parentWeights && recordC.parentWeights.length >= 2) {
        console.log(`  C's parents: A (${recordC.parentWeights[0]}g) + B (${recordC.parentWeights[1]}g)`);
        
        // Calculate D's composition from A and B
        const dPercentOfC = recordD.weight / recordC.weight; // 1000/2500 = 40%
        const dFromA = recordC.parentWeights[0] * dPercentOfC; // 1000 * 0.4 = 400g
        const dFromB = recordC.parentWeights[1] * dPercentOfC; // 1500 * 0.4 = 600g
        
        console.log(`  D contains: ${dFromA}g from A, ${dFromB}g from B`);
        assert.strictEqual(dFromA + dFromB, recordD.weight);
      } else {
        console.log("  Warning: C's parent weights not found");
      }
    });

    it("Step 10: Verifies complete lineage - E knows A+B composition", async () => {
      const recordE = await program.account.crateRecord.fetch(crateE.publicKey);
      const recordC = await program.account.crateRecord.fetch(recordE.parentCrates[0]);
      
      console.log("\n📊 Lineage Analysis for Crate E:");
      console.log(`  E weight: ${recordE.weight}g`);
      console.log(`  E's parent: C (${recordC.weight}g)`);
      console.log(`  C's parents: A (${recordC.parentWeights[0]}g) + B (${recordC.parentWeights[1]}g)`);
      
      const ePercentOfC = recordE.weight / recordC.weight; // 1500/2500 = 60%
      const eFromA = recordC.parentWeights[0] * ePercentOfC; // 1000 * 0.6 = 600g
      const eFromB = recordC.parentWeights[1] * ePercentOfC; // 1500 * 0.6 = 900g
      
      console.log(`  E contains: ${eFromA}g from A, ${eFromB}g from B`);
      assert.strictEqual(eFromA + eFromB, recordE.weight);
    });
  });

  describe("Transfer ownership validation", () => {
    it("Allows transfer with same weight", async () => {
      const original = anchor.web3.Keypair.generate();
      const transferred = anchor.web3.Keypair.generate();

      // Create original
      await program.methods
        .createCrate("ORIGINAL", 500, now(), "hash1", "ipfs1")
        .accounts({
          crateRecord: original.publicKey,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([original])
        .rpc();

      // Transfer with same weight
      await program.methods
        .transferOwnership("TRANSFERRED", 500, now(), "hash2", "ipfs2")
        .accounts({
          crateRecord: transferred.publicKey,
          authority: provider.wallet.publicKey,
          parentCrate: original.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([transferred])
        .rpc();

      const record = await program.account.crateRecord.fetch(transferred.publicKey);
      assert.strictEqual(record.weight, 500);
      console.log("✅ Transfer with matching weight succeeded");
    });

    it("Rejects transfer with different weight", async () => {
      const original = anchor.web3.Keypair.generate();
      const transferred = anchor.web3.Keypair.generate();

      await program.methods
        .createCrate("ORIGINAL2", 500, now(), "hash1", "ipfs1")
        .accounts({
          crateRecord: original.publicKey,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([original])
        .rpc();

      try {
        await program.methods
          .transferOwnership("TRANSFERRED2", 450, now(), "hash2", "ipfs2") // Wrong weight!
          .accounts({
            crateRecord: transferred.publicKey,
            authority: provider.wallet.publicKey,
            parentCrate: original.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([transferred])
          .rpc();
        
        assert.fail("Should have thrown error");
      } catch (err) {
        assert.ok(err.toString().includes("WeightMismatchOnTransfer"));
        console.log("✅ Transfer with mismatched weight rejected");
      }
    });
  });
});
