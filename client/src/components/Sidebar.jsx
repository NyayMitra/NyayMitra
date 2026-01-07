import React, { useEffect, useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import { MessageSquare, FolderPlus, MoreVertical, LogOut, Trash2 } from 'lucide-react';
import Logo from './Logo';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getChats, createChat, deleteChat } from '../lib/api';

const Sidebar = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { chatId } = useParams();
  
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
        loadChats();
    }
    
    const handleChatCreated = (event) => {
        if (event.detail) {
            setChats(prev => {
                // Prevent duplicates
                if (prev.some(c => c.id === event.detail.id)) return prev;
                return [event.detail, ...prev];
            });
        }
        if (user?.id) loadChats();
    };
    
    const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            setActiveMenuId(null);
        }
    };
    
    window.addEventListener('chat-created', handleChatCreated);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
        window.removeEventListener('chat-created', handleChatCreated);
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user?.id]);

  const loadChats = async () => {
    try {
        const data = await getChats(user.id);
        setChats(data || []);
    } catch (error) {
        console.error("Failed to load chats:", error);
    }
  };

  const handleDeleteChat = async (e, id) => {
      e.stopPropagation(); //prevent navigation
      if (!window.confirm("Are you sure you want to delete this chat?")) return;
      
      try {
          await deleteChat(id);
          setChats(chats.filter(c => c.id !== id));
          if (chatId === id) navigate('/chat'); // Redirect if deleting current chat
      } catch (error) {
          console.error("Failed to delete chat:", error);
      }
      setActiveMenuId(null);
  };
  
  const toggleMenu = (e, id) => {
      e.stopPropagation();
      setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleNewChat = () => {
      navigate('/chat');
  };

  const handleSignOut = async () => {
      await signOut();
      navigate('/');
  }

  return (
    <aside className="w-80 bg-[#0a0a0a] border-r border-gray-800 flex flex-col h-full">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3 justify-center">
            <Logo />
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={handleNewChat}
            disabled={loading}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 border-2 border-[#EFBF04] text-white bg-[#EFBF04]/10 hover:bg-[#EFBF04]/20`}
          >
            <FolderPlus className="h-5 w-5 text-[#EFBF04]" />
            <span className="font-medium text-[#EFBF04]">New Chat</span>
          </button>
        </nav>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          <h3 className="text-gray-400 text-xs font-semibold uppercase mb-3 px-2 mt-4">
            Your Chats
          </h3>
          
          <div className="space-y-2 pb-10">
            {chats.map((chat) => (
              <div key={chat.id} className="relative group">
                  <Button
                    onClick={() => navigate(`/chat/${chat.id}`)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-300 ${chatId === chat.id ? 'bg-gray-800 text-white' : 'bg-transparent text-gray-400 hover:bg-gray-900 hover:text-white'}`}
                  >
                    <span className="text-sm truncate flex-1 text-left pr-6">
                      {chat.title || "Untitled Chat"}
                    </span>
                  </Button>
                  
                  {/* Menu Trigger */}
                  <button 
                    onClick={(e) => toggleMenu(e, chat.id)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-opacity ${activeMenuId === chat.id ? 'opacity-100 bg-gray-700 text-white' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {activeMenuId === chat.id && (
                      <div ref={menuRef} className="absolute right-0 top-full mt-1 w-32 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <button 
                            onClick={(e) => handleDeleteChat(e, chat.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          >
                              <Trash2 className="h-4 w-4" />
                              Delete
                          </button>
                      </div>
                  )}
              </div>
            ))}
            {chats.length === 0 && (
                <div className="text-gray-600 text-sm text-center py-4">
                    Start a new chat to see history here.
                </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
             <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-700 to-blue-600 flex items-center justify-center overflow-hidden">
                {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                    <span className="text-white font-semibold text-xs">{user?.firstName?.[0] || "U"}</span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.fullName || "User"}</p>
                <p className="text-xs text-gray-500 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 text-sm"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
  );
};

export default Sidebar;