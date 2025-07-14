import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Item } from '../types';
import ItemCard from '../components/ItemCard';
import { Shield, Filter, Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'approved' | 'claimed'>('all');
  const [stats, setStats] = useState({
    totalItems: 0,
    pendingApproval: 0,
    claimedItems: 0,
    flaggedItems: 0,
  });

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    filterItems();
    calculateStats();
  }, [items, selectedFilter]);

  const loadItems = async () => {
    try {
      const itemsQuery = query(
        collection(db, 'items'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(itemsQuery);
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Item[];

      setItems(itemsData);
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error('Error loading items');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    switch (selectedFilter) {
      case 'pending':
        filtered = items.filter(item => item.isApproved === false);
        break;
      case 'approved':
        filtered = items.filter(item => item.isApproved === true);
        break;
      case 'claimed':
        filtered = items.filter(item => item.status === 'claimed');
        break;
      default:
        filtered = items;
    }

    setFilteredItems(filtered);
  };

  const calculateStats = () => {
    setStats({
      totalItems: items.length,
      pendingApproval: items.filter(item => item.isApproved === false).length,
      claimedItems: items.filter(item => item.status === 'claimed').length,
      flaggedItems: items.filter(item => item.status === 'pending').length,
    });
  };

  const handleApprove = async (itemId: string) => {
    try {
      await updateDoc(doc(db, 'items', itemId), {
        isApproved: true,
        updatedAt: new Date(),
      });
      
      setItems(items.map(item => 
        item.id === itemId ? { ...item, isApproved: true } : item
      ));
      
      toast.success('Item approved successfully');
    } catch (error) {
      console.error('Error approving item:', error);
      toast.error('Error approving item');
    }
  };

  const handleReject = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'items', itemId));
      
      setItems(items.filter(item => item.id !== itemId));
      
      toast.success('Item rejected and removed');
    } catch (error) {
      console.error('Error rejecting item:', error);
      toast.error('Error rejecting item');
    }
  };

  const statCards = [
    { title: 'Total Items', value: stats.totalItems, icon: TrendingUp, color: 'text-blue-600 bg-blue-100' },
    { title: 'Pending Approval', value: stats.pendingApproval, icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-100' },
    { title: 'Claimed Items', value: stats.claimedItems, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    { title: 'Flagged Items', value: stats.flaggedItems, icon: Shield, color: 'text-red-600 bg-red-100' },
  ];

  const filterOptions = [
    { value: 'all', label: 'All Items' },
    { value: 'pending', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'claimed', label: 'Claimed' },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <Shield className="w-8 h-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        <p className="text-gray-600">
          Manage items, approve submissions, and monitor platform activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filter by:</span>
          <div className="flex space-x-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedFilter(option.value as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedFilter === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No items found
          </h3>
          <p className="text-gray-600">
            No items match the selected filter criteria
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <ItemCard 
              key={item.id} 
              item={item} 
              isAdmin={true}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="fixed bottom-4 right-4">
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
          >
            <TrendingUp className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;