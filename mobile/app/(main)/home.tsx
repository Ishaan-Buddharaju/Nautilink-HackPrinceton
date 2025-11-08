import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface Transaction {
  id: string;
  number: number;
  timestamp: Date;
  hash: string;
  blockNumber: string;
  status: string;
  gasUsed: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [slideAnim] = useState(new Animated.Value(500));
  
  const [transactions] = useState<Transaction[]>([
    { 
      id: '1', 
      number: 1, 
      timestamp: new Date(),
      hash: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3',
      blockNumber: '15467892',
      status: 'Confirmed',
      gasUsed: '0.0021 ETH'
    },
    { 
      id: '2', 
      number: 2, 
      timestamp: new Date(Date.now() - 3600000),
      hash: '0x9B8fA1E3D7890c5432fA19B2c3e4d58F6a7D8901',
      blockNumber: '15467845',
      status: 'Confirmed',
      gasUsed: '0.0019 ETH'
    },
    { 
      id: '3', 
      number: 3, 
      timestamp: new Date(Date.now() - 7200000),
      hash: '0x3D4E8f9a1b2C567890dE12F3456A789012bC3dEf',
      blockNumber: '15467801',
      status: 'Confirmed',
      gasUsed: '0.0023 ETH'
    },
  ]);

  const handleQRPress = () => {
    // TODO: Implement QR scanner
    console.log('QR Scanner');
  };

  const handleFisherPress = () => {
    router.push('/(main)/trip');
  };

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const closeDetails = () => {
    Animated.timing(slideAnim, {
      toValue: 500,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSelectedTransaction(null);
    });
  };

  return (
    <View style={styles.container}>
      {/* Header with QR and Fisher buttons */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleQRPress}>
          <Text style={styles.headerButtonText}>QR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.headerButton, styles.fisherButton]}
          onPress={handleFisherPress}
        >
          <Text style={styles.headerButtonText}>Fisher</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Network Nodes Visualization */}
        <View style={styles.logoSection}>
          <View style={styles.nodesContainer}>
            {/* Central Node */}
            <View style={[styles.node, styles.centralNode]}>
              <View style={styles.nodeCore} />
            </View>
            
            {/* Connected Nodes */}
            <View style={[styles.node, styles.topLeftNode]}>
              <View style={styles.nodeCore} />
            </View>
            <View style={[styles.node, styles.topRightNode]}>
              <View style={styles.nodeCore} />
            </View>
            <View style={[styles.node, styles.bottomLeftNode]}>
              <View style={styles.nodeCore} />
            </View>
            <View style={[styles.node, styles.bottomRightNode]}>
              <View style={styles.nodeCore} />
            </View>
            
            {/* Connection Lines */}
            <View style={[styles.connectionLine, styles.lineTopLeft]} />
            <View style={[styles.connectionLine, styles.lineTopRight]} />
            <View style={[styles.connectionLine, styles.lineBottomLeft]} />
            <View style={[styles.connectionLine, styles.lineBottomRight]} />
          </View>
        </View>

        {/* Transaction Log Section */}
        <View style={styles.transactionSection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          <ScrollView style={styles.transactionList} showsVerticalScrollIndicator={false}>
            {transactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.transactionItem}
                activeOpacity={0.7}
                onPress={() => handleTransactionPress(transaction)}
              >
                <View style={styles.transactionIcon}>
                  <Ionicons name="document-text-outline" size={24} color={Colors.accentPrimary} />
                </View>
                <View style={styles.transactionContent}>
                  <Text style={styles.transactionTitle}>
                    Log Transaction #{transaction.number}
                  </Text>
                  <Text style={styles.transactionTime}>
                    {transaction.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Transaction Details Slide-over */}
      <Modal
        visible={selectedTransaction !== null}
        transparent
        animationType="none"
        onRequestClose={closeDetails}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={closeDetails}
        >
          <Animated.View 
            style={[
              styles.slideOver,
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.slideOverHeader}>
                <Text style={styles.slideOverTitle}>Transaction Details</Text>
                <TouchableOpacity onPress={closeDetails} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={Colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.slideOverContent}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Transaction #</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction?.number}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Hash</Text>
                  <Text style={styles.detailValueMono}>
                    {selectedTransaction?.hash}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Block Number</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction?.blockNumber}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {selectedTransaction?.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Gas Used</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction?.gasUsed}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Timestamp</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction?.timestamp.toLocaleString()}
                  </Text>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    backgroundColor: Colors.surfaceGlass,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    minWidth: 100,
    alignItems: 'center',
  },
  fisherButton: {
    backgroundColor: Colors.accentPrimary,
    borderColor: Colors.accentPrimary,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  nodesContainer: {
    width: 200,
    height: 200,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  node: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 2,
    borderColor: Colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  centralNode: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
  },
  nodeCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accentPrimary,
  },
  topLeftNode: {
    top: 20,
    left: 40,
  },
  topRightNode: {
    top: 20,
    right: 40,
  },
  bottomLeftNode: {
    bottom: 20,
    left: 40,
  },
  bottomRightNode: {
    bottom: 20,
    right: 40,
  },
  connectionLine: {
    position: 'absolute',
    backgroundColor: Colors.accentPrimary,
    opacity: 0.4,
  },
  lineTopLeft: {
    width: 80,
    height: 2,
    top: 90,
    left: 50,
    transform: [{ rotate: '-45deg' }],
  },
  lineTopRight: {
    width: 80,
    height: 2,
    top: 90,
    right: 50,
    transform: [{ rotate: '45deg' }],
  },
  lineBottomLeft: {
    width: 80,
    height: 2,
    bottom: 90,
    left: 50,
    transform: [{ rotate: '45deg' }],
  },
  lineBottomRight: {
    width: 80,
    height: 2,
    bottom: 90,
    right: 50,
    transform: [{ rotate: '-45deg' }],
  },
  transactionSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  transactionList: {
    backgroundColor: Colors.surfacePrimary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  slideOver: {
    width: '85%',
    height: '100%',
    backgroundColor: Colors.background,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  slideOverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  slideOverTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideOverContent: {
    padding: 20,
  },
  detailItem: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.foreground,
    fontWeight: '500',
  },
  detailValueMono: {
    fontSize: 13,
    color: Colors.foreground,
    fontFamily: 'Courier',
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
});
