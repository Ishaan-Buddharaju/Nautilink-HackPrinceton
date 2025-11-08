use anchor_lang::prelude::*;

declare_id!("FHzgesT5QzphL5eucFCjL9KL59TLs3jztw7Qe9RZjHta");

#[program]
pub mod nautilink {
    use super::*;

    /// Creates the initial crate record (no parents)
    pub fn create_crate(
        ctx: Context<CreateCrate>,
        crate_id: String,
        weight: u32,
        timestamp: i64,
        hash: String,
        ipfs_cid: String,
    ) -> Result<()> {
        let record = &mut ctx.accounts.crate_record;
        record.crate_id = crate_id;
        record.weight = weight;
        record.timestamp = timestamp;
        record.hash = hash;
        record.ipfs_cid = ipfs_cid;
        record.authority = ctx.accounts.authority.key();
        record.parent_crates = Vec::new();
        record.child_crates = Vec::new();
        record.parent_weights = Vec::new();
        record.operation_type = OperationType::Created;
        
        Ok(())
    }

    /// Transfers ownership without mixing/splitting - weight must remain the same
    pub fn transfer_ownership(
        ctx: Context<TransferOwnership>,
        crate_id: String,
        weight: u32,
        timestamp: i64,
        hash: String,
        ipfs_cid: String,
    ) -> Result<()> {
        let parent = &ctx.accounts.parent_crate;
        
        // RULE: Weight must remain the same for simple transfers
        require!(
            weight == parent.weight,
            ErrorCode::WeightMismatchOnTransfer
        );

        let record = &mut ctx.accounts.crate_record;
        record.crate_id = crate_id;
        record.weight = weight;
        record.timestamp = timestamp;
        record.hash = hash;
        record.ipfs_cid = ipfs_cid;
        record.authority = ctx.accounts.authority.key();
        record.parent_crates = vec![parent.key()];
        record.child_crates = Vec::new();
        record.parent_weights = vec![parent.weight];
        record.operation_type = OperationType::Transferred;

        Ok(())
    }

    /// Mixes multiple parent crates into one child crate
    pub fn mix_crates(
        ctx: Context<MixCrates>,
        crate_id: String,
        timestamp: i64,
        hash: String,
        ipfs_cid: String,
        parent_keys: Vec<Pubkey>,
    ) -> Result<()> {
        require!(
            parent_keys.len() >= 2,
            ErrorCode::MixRequiresMultipleParents
        );
        require!(
            parent_keys.len() <= CrateRecord::MAX_PARENTS,
            ErrorCode::TooManyParents
        );

        // Calculate total weight and store parent weights
        let mut total_weight: u32 = 0;
        let mut parent_weights = Vec::new();
        
        for parent_info in ctx.remaining_accounts.iter() {
            let parent: Account<CrateRecord> = Account::try_from(parent_info)?;
            total_weight = total_weight.checked_add(parent.weight)
                .ok_or(ErrorCode::WeightOverflow)?;
            parent_weights.push(parent.weight);
        }

        let record = &mut ctx.accounts.crate_record;
        record.crate_id = crate_id;
        record.weight = total_weight;
        record.timestamp = timestamp;
        record.hash = hash;
        record.ipfs_cid = ipfs_cid;
        record.authority = ctx.accounts.authority.key();
        record.parent_crates = parent_keys;
        record.child_crates = Vec::new();
        record.parent_weights = parent_weights;
        record.operation_type = OperationType::Mixed;

        Ok(())
    }

    /// Splits one parent crate into multiple child crates
    pub fn split_crate(
        ctx: Context<SplitCrate>,
        crate_id: String,
        weight: u32,
        timestamp: i64,
        hash: String,
        ipfs_cid: String,
        child_keys: Vec<Pubkey>,
        child_weights: Vec<u32>,
    ) -> Result<()> {
        let parent = &ctx.accounts.parent_crate;

        require!(
            child_keys.len() >= 2,
            ErrorCode::SplitRequiresMultipleChildren
        );
        require!(
            child_keys.len() <= CrateRecord::MAX_CHILDREN,
            ErrorCode::TooManyChildren
        );
        require!(
            child_keys.len() == child_weights.len(),
            ErrorCode::ChildKeyWeightMismatch
        );

        // Verify split weights sum to parent weight
        let total_child_weight: u32 = child_weights.iter().sum();
        require!(
            total_child_weight == parent.weight,
            ErrorCode::SplitWeightMismatch
        );

        let record = &mut ctx.accounts.crate_record;
        record.crate_id = crate_id;
        record.weight = weight; // This specific child's weight
        record.timestamp = timestamp;
        record.hash = hash;
        record.ipfs_cid = ipfs_cid;
        record.authority = ctx.accounts.authority.key();
        record.parent_crates = vec![parent.key()];
        record.child_crates = child_keys.clone();
        record.parent_weights = vec![parent.weight];
        record.operation_type = OperationType::Split;
        
        // Store how the parent was distributed among children
        record.split_distribution = child_weights;

        Ok(())
    }

    /// Updates parent to record its children after split
    pub fn update_parent_children(
        ctx: Context<UpdateParent>,
        child_keys: Vec<Pubkey>,
    ) -> Result<()> {
        let parent = &mut ctx.accounts.parent_crate;
        
        require!(
            ctx.accounts.authority.key() == parent.authority,
            ErrorCode::UnauthorizedUpdate
        );
        
        parent.child_crates = child_keys;
        Ok(())
    }

    /// Updates child to record its parent after mix
    pub fn update_child_parent(
        ctx: Context<UpdateChild>,
        parent_key: Pubkey,
    ) -> Result<()> {
        let child = &mut ctx.accounts.child_crate;
        
        require!(
            ctx.accounts.authority.key() == child.authority,
            ErrorCode::UnauthorizedUpdate
        );
        
        if !child.parent_crates.contains(&parent_key) {
            child.parent_crates.push(parent_key);
        }
        
        Ok(())
    }
}

// ===================
// CONTEXTS
// ===================

#[derive(Accounts)]
#[instruction(crate_id: String)]
pub struct CreateCrate<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + CrateRecord::MAX_SIZE
    )]
    pub crate_record: Account<'info, CrateRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(crate_id: String)]
pub struct TransferOwnership<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + CrateRecord::MAX_SIZE
    )]
    pub crate_record: Account<'info, CrateRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// The parent crate being transferred
    pub parent_crate: Account<'info, CrateRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(crate_id: String)]
pub struct MixCrates<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + CrateRecord::MAX_SIZE
    )]
    pub crate_record: Account<'info, CrateRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    // Parent crates passed via remaining_accounts
}

#[derive(Accounts)]
#[instruction(crate_id: String)]
pub struct SplitCrate<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + CrateRecord::MAX_SIZE
    )]
    pub crate_record: Account<'info, CrateRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// The parent crate being split
    pub parent_crate: Account<'info, CrateRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateParent<'info> {
    #[account(mut)]
    pub parent_crate: Account<'info, CrateRecord>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateChild<'info> {
    #[account(mut)]
    pub child_crate: Account<'info, CrateRecord>,
    pub authority: Signer<'info>,
}

// ===================
// DATA STRUCTURES
// ===================

#[account]
pub struct CrateRecord {
    pub authority: Pubkey,           // Current owner
    pub crate_id: String,            // Unique identifier
    pub weight: u32,                 // Weight in grams
    pub timestamp: i64,              // Creation/operation timestamp
    pub hash: String,                // SHA256 hash
    pub ipfs_cid: String,            // IPFS content ID
    
    // Lineage tracking
    pub parent_crates: Vec<Pubkey>,  // Parent crate accounts
    pub child_crates: Vec<Pubkey>,   // Child crate accounts
    pub parent_weights: Vec<u32>,    // Original weight of each parent
    pub split_distribution: Vec<u32>, // How weight was distributed in split
    
    pub operation_type: OperationType, // What operation created this record
}

impl CrateRecord {
    pub const MAX_PARENTS: usize = 10;
    pub const MAX_CHILDREN: usize = 10;
    pub const MAX_SIZE: usize = 
        32 +                                    // authority
        4 + 64 +                                // crate_id
        4 +                                     // weight
        8 +                                     // timestamp
        4 + 64 +                                // hash
        4 + 64 +                                // ipfs_cid
        4 + (Self::MAX_PARENTS * 32) +          // parent_crates
        4 + (Self::MAX_CHILDREN * 32) +         // child_crates
        4 + (Self::MAX_PARENTS * 4) +           // parent_weights
        4 + (Self::MAX_CHILDREN * 4) +          // split_distribution
        1;                                      // operation_type
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum OperationType {
    Created,      // Initial creation
    Transferred,  // Simple ownership transfer
    Mixed,        // Result of mixing multiple crates
    Split,        // Result of splitting a crate
}

// ===================
// ERROR CODES
// ===================

#[error_code]
pub enum ErrorCode {
    #[msg("Weight must remain the same during transfer")]
    WeightMismatchOnTransfer,
    
    #[msg("Mix operation requires at least 2 parent crates")]
    MixRequiresMultipleParents,
    
    #[msg("Split operation requires at least 2 child crates")]
    SplitRequiresMultipleChildren,
    
    #[msg("Too many parent crates (max 10)")]
    TooManyParents,
    
    #[msg("Too many child crates (max 10)")]
    TooManyChildren,
    
    #[msg("Child keys and weights arrays must have same length")]
    ChildKeyWeightMismatch,
    
    #[msg("Sum of split weights must equal parent weight")]
    SplitWeightMismatch,
    
    #[msg("Weight calculation overflow")]
    WeightOverflow,
    
    #[msg("Unauthorized to update this record")]
    UnauthorizedUpdate,
}
