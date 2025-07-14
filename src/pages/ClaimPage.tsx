import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Item } from '../types';
import { Shield, Mail, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ClaimPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');

  useEffect(() => {
    if (id) {
      loadItem();
    }
  }, [id]);

  const loadItem = async () => {
    if (!id) return;
    
    try {
      const docRef = doc(db, 'items', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const itemData = {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt.toDate(),
          updatedAt: docSnap.data().updatedAt.toDate(),
        } as Item;
        setItem(itemData);
      } else {
        toast.error('Item not found');
        navigate('/search');
      }
    } catch (error) {
      console.error('Error loading item:', error);
      toast.error('Error loading item details');
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!user?.email || !item) return;
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    
    // In production, send OTP via email using Firebase Functions or external service
    // For now, just show it in console and toast
    console.log('Generated OTP:', otp);
    toast.success(`OTP sent to ${user.email}: ${otp}`);
    
    setSentOtp(true);
  };

  const verifyOtp = async () => {
    if (!user || !item || !id) return;
    
    setVerifying(true);
    
    try {
      if (otp === generatedOtp) {
        // Update item status to claimed
        await updateDoc(doc(db, 'items', id), {
          status: 'claimed',
          claimantId: user.uid,
          claimantEmail: user.email,
          claimedAt: new Date(),
        });
        
        toast.success('Item claimed successfully!');
        navigate('/profile');
      } else {
        toast.error('Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('Error verifying OTP');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="h-48 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Item Not Found</h2>
          <p className="text-gray-600">The item you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (item.status === 'claimed') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Already Claimed</h2>
          <p className="text-gray-600">This item has already been claimed by someone else.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Claim Item
        </h1>
        <p className="text-gray-600">
          Verify your identity to claim this item
        </p>
      </div>

      {/* Item Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-64 object-cover rounded-t-lg"
          />
        )}
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
          <p className="text-gray-600 mb-4">{item.description}</p>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Location:</span>
              <p className="font-medium">{item.location}</p>
            </div>
            <div>
              <span className="text-gray-500">Found by:</span>
              <p className="font-medium">{item.userEmail}</p>
            </div>
          </div>

          {item.imageLabels && item.imageLabels.length > 0 && (
            <div className="mt-4">
              <span className="text-gray-500 text-sm">AI Tags:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {item.imageLabels.map((label, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification Process */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Shield className="w-6 h-6 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Identity Verification</h3>
        </div>

        {!sentOtp ? (
          <div>
            <p className="text-gray-600 mb-4">
              To claim this item, we need to verify your identity. We'll send a verification code to your email.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">
                  Verification code will be sent to: <strong>{user?.email}</strong>
                </span>
              </div>
            </div>

            <button
              onClick={sendOtp}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Send Verification Code
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              We've sent a 6-digit verification code to your email. Please enter it below to claim the item.
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={verifyOtp}
                  disabled={verifying || otp.length !== 6}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </div>
                  ) : (
                    'Claim Item'
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setSentOtp(false);
                    setOtp('');
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Resend Code
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Only claim items that actually belong to you. 
                False claims may result in account suspension.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimPage;