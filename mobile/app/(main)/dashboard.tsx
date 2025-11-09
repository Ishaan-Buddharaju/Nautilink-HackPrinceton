import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';
import Constants from 'expo-constants';

interface BlockchainTransaction {
  id: string;
  number: number;
  timestamp: Date;
  signature: string; // Solana transaction signature
  slot: string; // Solana slot number
  status: string;
  operation: 'CREATE_CRATE' | 'TRANSFER_OWNERSHIP' | 'MIX_CRATES' | 'SPLIT_CRATE';
  crateId: string;
  weight: number;
  programId: string; // Nautilink program ID
}

// Backend API URL - update this to match your backend URL
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8000';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, isLoading, session } = useAuth();

  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY RETURNS
  const [selectedTransaction, setSelectedTransaction] = useState<BlockchainTransaction | null>(null);
  const [slideAnim] = useState(new Animated.Value(500));
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [fetchingTransactions, setFetchingTransactions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canScan = user?.roles?.includes('fisher') || user?.roles?.includes('supplier');

  // Fetch transactions from backend
  const fetchTransactions = async () => {
    if (!session?.access_token) return;
    
    setFetchingTransactions(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/web3/transactions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform API data to match component interface
      const transformedTransactions = data.transactions.map((tx: any, index: number) => ({
        ...tx,
        number: index + 1,
        timestamp: new Date(tx.timestamp),
      }));
      
      setTransactions(transformedTransactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      Alert.alert('Error', 'Failed to load transactions. Using offline mode.');
    } finally {
      setFetchingTransactions(false);
    }
  };

  // Redirect to login if not authenticated (exactly like web app)
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, isLoading, router]);

  // Fetch transactions when component mounts and user is authenticated
  useEffect(() => {
    if (user && session?.access_token) {
      fetchTransactions();
    }
  }, [user, session]);

  // Show loading while checking auth or fetching transactions
  if (isLoading || fetchingTransactions) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accentPrimary} />
        <Text style={{ color: Colors.foreground, marginTop: 16 }}>
          {isLoading ? 'Loading...' : 'Fetching transactions...'}
        </Text>
      </View>
    );
  }

  // If no user after loading, return null (will redirect)
  if (!user) {
    return null;
  }

  const handleScanQR = () => {
    router.push('/(main)/qr-scanner');
  };

  // Refresh transactions
  const refreshTransactions = () => {
    fetchTransactions();
  };

  // For demo purposes, we'll add a manual button to simulate transaction completion
  // In a real app, this would be triggered by successful QR + NFC scan completion

  const handleTransactionPress = (transaction: BlockchainTransaction) => {
    setSelectedTransaction(transaction);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
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
      {/* Header */}
      <View style={[styles.header, !canScan && styles.headerCentered]}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        {canScan && (
          <TouchableOpacity onPress={handleScanQR} style={styles.qrButton}>
            <Ionicons name="qr-code-outline" size={24} color={Colors.foreground} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {/* Transaction Chain Visualization */}
        <View style={styles.logoSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.chainContainer}
            contentContainerStyle={styles.chainContent}
          >
            {transactions.map((transaction, index) => (
              <View key={transaction.id} style={styles.chainNodeContainer}>
                {/* Node */}
                <TouchableOpacity
                  style={[
                    styles.chainNode,
                    selectedTransaction?.id === transaction.id && styles.chainNodeHighlighted
                  ]}
                  onPress={() => handleTransactionPress(transaction)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.chainNodeText,
                    selectedTransaction?.id === transaction.id && styles.chainNodeTextHighlighted
                  ]}>
                    {transaction.number}
                  </Text>
                </TouchableOpacity>
                
                {/* Connection Line to next node */}
                {index < transactions.length - 1 && (
                  <View style={styles.chainLine} />
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Transaction Log Section */}
        <View style={styles.transactionSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Log</Text>
            <TouchableOpacity onPress={refreshTransactions} style={styles.refreshButton}>
              <Ionicons name="refresh" size={18} color={Colors.accentPrimary} />
            </TouchableOpacity>
          </View>
          
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={16} color="#ff6b6b" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Scan a QR code to add your first transaction</Text>
            </View>
          ) : (
            <ScrollView style={styles.transactionList} showsVerticalScrollIndicator={false}>
            {transactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={[
                  styles.transactionItem,
                  selectedTransaction?.id === transaction.id && styles.transactionItemHighlighted
                ]}
                onPress={() => handleTransactionPress(transaction)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.transactionIcon,
                  selectedTransaction?.id === transaction.id && styles.transactionIconHighlighted
                ]}>
                  <Ionicons name="document-text-outline" size={20} color={
                    selectedTransaction?.id === transaction.id ? Colors.background : Colors.accentPrimary
                  } />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={[
                    styles.transactionTitle,
                    selectedTransaction?.id === transaction.id && styles.transactionTitleHighlighted
                  ]}>Transaction {transaction.number}</Text>
                  <Text style={styles.transactionTime}>{transaction.weight}g • {transaction.timestamp.toLocaleTimeString()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
            </ScrollView>
          )}
        </View>

        {/* Add Transaction Button */}
        <TouchableOpacity
          style={styles.addTransactionButton}
          onPress={handleScanQR}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={28} color={Colors.accentPrimary} />
          <Text style={styles.addTransactionText}>Add Transaction</Text>
        </TouchableOpacity>
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
              styles.detailsContainer,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Transaction Details</Text>
              <TouchableOpacity onPress={closeDetails}>
                <Ionicons name="close" size={28} color={Colors.foreground} />
              </TouchableOpacity>
            </View>

            {selectedTransaction && (
              <ScrollView style={styles.detailsContent}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction #</Text>
                  <Text style={styles.detailValue}>{selectedTransaction.number}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Operation</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction.operation.replace('_', ' ')}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Crate ID</Text>
                  <Text style={styles.detailValue}>{selectedTransaction.crateId}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Weight</Text>
                  <Text style={styles.detailValue}>{selectedTransaction.weight}g</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Signature</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {selectedTransaction.signature}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Slot</Text>
                  <Text style={styles.detailValue}>{selectedTransaction.slot}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, styles.statusConfirmed]}>
                    {selectedTransaction.status}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Program ID</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {selectedTransaction.programId}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Timestamp</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction.timestamp.toLocaleString()}
                  </Text>
                </View>
              </ScrollView>
            )}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerCentered: {
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    letterSpacing: 0.5,
  },
  qrButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  logoSection: {
    paddingVertical: 20,
    marginBottom: 20,
  },
  chainContainer: {
    height: 80,
  },
  chainContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  chainNodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chainNode: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 2,
    borderColor: Colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  chainNodeHighlighted: {
    backgroundColor: Colors.accentPrimary,
    borderColor: Colors.accentLight,
    shadowOpacity: 1,
    shadowRadius: 10,
    transform: [{ scale: 1.1 }],
  },
  chainNodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accentPrimary,
  },
  chainNodeTextHighlighted: {
    color: Colors.background,
  },
  chainLine: {
    width: 30,
    height: 3,
    backgroundColor: Colors.accentPrimary,
    opacity: 0.6,
    marginHorizontal: 5,
  },
  transactionSection: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accentLight,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  transactionList: {
    backgroundColor: Colors.surfacePrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surfacePrimary,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accentLight,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  transactionTime: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  addTransactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  addTransactionText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accentLight,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  detailsContainer: {
    width: '85%',
    height: '100%',
    backgroundColor: Colors.surfacePrimary,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
  },
  detailsContent: {
    flex: 1,
    padding: 20,
  },
  detailRow: {
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
  statusConfirmed: {
    color: Colors.accentPrimary,
    fontWeight: '700',
  },
  transactionItemHighlighted: {
    backgroundColor: Colors.accentPrimary + '20',
    borderLeftWidth: 4,
    borderLeftColor: Colors.accentPrimary,
  },
  transactionIconHighlighted: {
    backgroundColor: Colors.accentPrimary,
    borderColor: Colors.accentLight,
  },
  transactionTitleHighlighted: {
    color: Colors.accentPrimary,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#ff6b6b',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: Colors.surfacePrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
