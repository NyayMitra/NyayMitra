import React from 'react';
import { Button } from '../components/ui/button';
import { MessageSquare, FolderPlus, MoreVertical } from 'lucide-react';
import Logo from './Logo';

const Sidebar = ({ recents, setRecents, activeChat, setActiveChat }) => {
  return (
    <aside className="w-80 bg-[#0a0a0a] border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3 justify-center">
            <Logo />
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => setActiveChat('new')}
            className={`md:w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${activeChat === 'new' ? ' bg-opacity-10 border-2 border-[#EFBF04] text-white': 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <FolderPlus className="h-5 w-5" />
            <span className="font-medium">New Chat</span>
          </button>
          
          <button
            onClick={() => setActiveChat('chats')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-300"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium">Chats</span>
          </button>
        </nav>

        <div className="flex-1 overflow-y-auto px-4">
          <h3 className="text-gray-400 text-xs font-semibold uppercase mb-3 px-2">
            Recents
          </h3>
          
          <div className="space-y-2">
            {recents.map((chat) => (
              <Button
                key={chat.id}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-900 hover:bg-gray-800 transition-all duration-300 group"
              >
                <span className="text-white text-sm truncate flex-1 text-left">
                  {chat.title}
                </span>
                <MoreVertical className="h-4 w-4 text-gray-500 group-hover:text-gray-300" />
              </Button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-300">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-700 to-blue-600 flex items-center justify-center">
              <span className="text-white font-semibold">AN</span>
            </div>
            <span className="font-medium">Account Name</span>
          </button>
        </div>
      </aside>
  );
};

export default Sidebar;