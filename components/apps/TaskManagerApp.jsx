import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Clock, Trash2, Paperclip, MessageSquare, Plus, GripVertical, X, Shield, Upload, RefreshCw, FileText, Download, UserCircle, Target, Briefcase, Zap, Globe, Layout, Monitor, Smartphone, Server, Database, Code, PenTool, Hash, Star, Loader2, Archive, RotateCcw, Settings } from 'lucide-react';

// --- INLINED CONSTANTS & HELPERS ---
const API_URL = 'https://api.fytsolutions.com/api.php';

const availableTags = ['Bug', 'Feature', 'Enhancement', 'Design', 'Content', 'Marketing', 'Urgent', 'Low Priority', 'Review'];

const tagStyles = {
  'Bug': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Feature': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Enhancement': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Design': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Content': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Marketing': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Urgent': 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold',
  'Low Priority': 'bg-white/5 text-gray-400 border-white/10',
  'Review': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
};

const availableColors = ['blue', 'emerald', 'rose', 'amber', 'purple', 'cyan', 'slate'];

const colorStyles = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', bar: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', bar: 'bg-emerald-500' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', bar: 'bg-rose-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', bar: 'bg-amber-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', bar: 'bg-purple-500' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', bar: 'bg-cyan-500' },
  slate: { bg: 'bg-white/5', text: 'text-gray-300', border: 'border-white/10', bar: 'bg-gray-500' }
};

const iconMap = { Target, Briefcase, Zap, Globe, Layout, Monitor, Smartphone, Server, Database, Code, PenTool, Hash, Star };
const availableIcons = Object.keys(iconMap);

const DynamicIcon = ({ name, size = 16, className = "" }) => {
    const IconComponent = iconMap[name] || Briefcase;
    return <IconComponent size={size} className={className} />;
};

const isOverdue = (date, status) => {
    if (!date || status === 'done') return false;
    return new Date(date) < new Date(new Date().setHours(0,0,0,0));
};

const formatDate = (dateString) => {
    if (!dateString) return 'No Date';
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- SUBCOMPONENTS ---

function TagDisplay({ tags }) {
    if (!tags || tags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map(tag => (
          <span key={tag} className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${tagStyles[tag] || 'bg-white/5 text-gray-400 border-white/10'}`}>
            {tag}
          </span>
        ))}
      </div>
    );
}

function TaskMobileCard({ task, users, handleToggleTaskStatus, openTaskModal, handleDeleteTask, draggable = false, onDragStart, onDragOver, onDragEnd, isDragged }) {
  const [isDragReady, setIsDragReady] = useState(false);
  const assignee = users?.find(u => u.id === task.assigneeId);
  const taskIsOverdue = isOverdue(task.dueDate, task.status);

  return (
    <div 
      draggable={draggable && isDragReady} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}
      className={`p-4 transition-colors group border-b border-white/5 last:border-b-0 ${isDragged ? 'opacity-50 bg-white/5' : 'hover:bg-white/5'}`}
    >
      <div className="flex items-start gap-2 mb-2">
        {draggable && (
           <div onMouseEnter={() => setIsDragReady(true)} onMouseLeave={() => setIsDragReady(false)} onTouchStart={() => setIsDragReady(true)} onTouchEnd={() => setIsDragReady(false)} className="cursor-grab active:cursor-grabbing p-1 -ml-2 mt-0.5 text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0">
             <GripVertical size={16} />
           </div>
        )}
        <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleTaskStatus(task); }} className="mt-1 flex-shrink-0 p-0.5 block" >
            {task.status === 'done' ? <CheckCircle size={18} className="text-[#9df01c]" /> : <Circle size={18} className="text-gray-600 hover:text-[#9df01c]" />}
        </button>
        <div className={`mt-2 w-2.5 h-2.5 rounded-full flex-shrink-0 ${task.status === 'done' ? 'bg-[#9df01c]' : task.status === 'in-progress' ? 'bg-amber-400' : 'bg-gray-600'}`} />
        <div className={`flex-1 font-medium cursor-pointer transition-colors leading-tight pt-1 ml-0.5 ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-200 hover:text-[#9df01c]'}`} onClick={(e) => { e.stopPropagation(); openTaskModal(task); }}>
          {task.title}
        </div>
      </div>
      <div className="pl-8 flex flex-wrap items-center gap-x-3 gap-y-2">
        <TagDisplay tags={task.tags} />
        {task.files && task.files.length > 0 && <span className="flex items-center text-gray-400 bg-black p-1 rounded-md border border-white/10" title="Has Attachments"><Paperclip size={14} /></span>}
        {task.comments && task.comments.length > 0 && <span className="flex items-center gap-1 text-gray-400 bg-black px-1.5 py-0.5 rounded-md border border-white/10 text-[10px] font-bold" title="Comments"><MessageSquare size={12} /> {task.comments.length}</span>}
        
        {assignee && (
          <span className={`flex items-center gap-1.5 text-xs font-medium ${task.status === 'done' ? 'text-gray-600' : 'text-gray-400'}`}>
            {assignee.avatarUrl ? <img src={assignee.avatarUrl} alt="Avatar" className={`w-4 h-4 rounded-full object-cover ${task.status === 'done' ? 'grayscale opacity-60' : ''}`} /> : <UserCircle size={14} className={task.status === 'done' ? 'text-gray-600' : 'text-gray-500'} />}
            {assignee.name.split(' ')[0]}
          </span>
        )}
        
        <div className="flex items-center gap-3 ml-auto">
          <div className={`text-xs flex items-center gap-1 whitespace-nowrap ${taskIsOverdue ? 'text-red-400 font-bold' : 'text-gray-500'} ${task.status === 'done' ? 'text-gray-600' : ''}`}>
            <Clock size={12} className={taskIsOverdue ? 'text-red-400' : 'text-gray-600'} />{formatDate(task.dueDate)}
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="text-gray-600 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskDesktopRow({ task, users, handleToggleTaskStatus, openTaskModal, handleDeleteTask, draggable = false, onDragStart, onDragOver, onDragEnd, isDragged }) {
  const [isDragReady, setIsDragReady] = useState(false);
  const assignee = users?.find(u => u.id === task.assigneeId);
  const taskIsOverdue = isOverdue(task.dueDate, task.status);
  
  return (
    <tr draggable={draggable && isDragReady} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} className={`border-b border-white/5 transition-colors group ${isDragged ? 'opacity-50 bg-white/5' : 'hover:bg-white/5'}`}>
      <td className="p-4 w-16 pr-1 align-middle">
        <div className="flex items-center h-full gap-1">
          {draggable && (
            <div onMouseEnter={() => setIsDragReady(true)} onMouseLeave={() => setIsDragReady(false)} onTouchStart={() => setIsDragReady(true)} onTouchEnd={() => setIsDragReady(false)} className="cursor-grab active:cursor-grabbing p-1 -ml-2 text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0">
               <GripVertical size={16} />
            </div>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleTaskStatus(task); }} className="cursor-pointer flex-shrink-0 p-1 block mt-0.5">
            {task.status === 'done' ? <CheckCircle size={18} className="text-[#9df01c]" /> : <Circle size={18} className="text-gray-600 hover:text-[#9df01c]" />}
          </button>
        </div>
      </td>
      <td className="py-4 px-2 w-8 align-middle">
        <div className={`w-2.5 h-2.5 rounded-full ${task.status === 'done' ? 'bg-[#9df01c]' : task.status === 'in-progress' ? 'bg-amber-400' : 'bg-gray-600'}`} title={task.status} />
      </td>
      <td className="p-4 align-middle">
        <div className={`font-medium cursor-pointer transition-colors w-fit ${task.status === 'done' ? 'text-gray-500 line-through hover:text-[#9df01c]' : 'text-gray-200 hover:text-[#9df01c]'}`} onClick={(e) => { e.stopPropagation(); openTaskModal(task); }}>
          {task.title}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <TagDisplay tags={task.tags} />
          {task.files && task.files.length > 0 && <span className="flex items-center text-gray-400 bg-black p-1 rounded-md border border-white/10" title="Has Attachments"><Paperclip size={14} /></span>}
          {task.comments && task.comments.length > 0 && <span className="flex items-center gap-1 text-gray-400 bg-black px-1.5 py-0.5 rounded-md border border-white/10 text-[10px] font-bold" title="Comments"><MessageSquare size={12} /> {task.comments.length}</span>}
        </div>
      </td>
      <td className="p-4 text-sm text-gray-400 whitespace-nowrap align-middle">
        {assignee && (
          <span className={`flex items-center gap-1.5 ${task.status === 'done' ? 'opacity-60 grayscale' : ''}`}>
            {assignee.avatarUrl ? <img src={assignee.avatarUrl} alt="Avatar" className="w-5 h-5 rounded-full object-cover" /> : <UserCircle size={16} className="text-gray-600" />}
            {assignee.name.split(' ')[0]}
          </span>
        )}
      </td>
      <td className={`p-4 text-sm flex items-center justify-between whitespace-nowrap align-middle ${taskIsOverdue ? 'text-red-400 font-bold' : 'text-gray-400'} ${task.status === 'done' ? 'text-gray-600' : ''}`}>
        <span className="flex items-center gap-1"><Clock size={14} className={taskIsOverdue ? 'text-red-400' : 'text-gray-600'} />{formatDate(task.dueDate)}</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="text-gray-600 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 ml-4" title="Delete Task">
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}

function TaskModal({
    currentTask, setCurrentTask, handleSaveTask, handleDeleteTask, setIsTaskModalOpen,
    users, isUploading, handleFileUpload, removeFile,
    newCommentText, setNewCommentText, handleAddComment, currentUser
  }) {
    const getUser = (id) => users.find(u => u.id === id);
  
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-white/10 border-t-4 border-t-[#9df01c]">
          <div className="flex justify-between items-center p-6 border-b border-white/5 flex-shrink-0">
            <h3 className="font-black uppercase italic tracking-tighter text-lg text-white flex items-center gap-2">
              <CheckCircle className="text-[#9df01c]" size={20} />
              {currentTask.id ? 'Edit Task' : 'New Task'}
            </h3>
            <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
          </div>
          <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
            <form id="taskForm" onSubmit={handleSaveTask} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Task Title</label>
                <input required type="text" value={currentTask.title} onChange={(e) => setCurrentTask({...currentTask, title: e.target.value})} className="w-full px-4 py-3 bg-black border border-white/10 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9df01c]" placeholder="What needs to be done?" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Assignee</label>
                  <select value={currentTask.assigneeId || ''} onChange={(e) => setCurrentTask({...currentTask, assigneeId: e.target.value})} className="w-full px-4 py-3 bg-black border border-white/10 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9df01c]">
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Due Date</label>
                  <input type="date" value={currentTask.dueDate} onChange={(e) => setCurrentTask({...currentTask, dueDate: e.target.value})} className="w-full px-4 py-3 bg-black border border-white/10 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9df01c]" style={{ colorScheme: 'dark' }} />
                </div>
  
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Status</label>
                  <select value={currentTask.status} onChange={(e) => setCurrentTask({...currentTask, status: e.target.value})} className="w-full px-4 py-3 bg-black border border-white/10 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9df01c]">
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
  
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button key={tag} type="button" onClick={() => {
                      const newTags = currentTask.tags.includes(tag) ? currentTask.tags.filter(t => t !== tag) : [...currentTask.tags, tag];
                      setCurrentTask({...currentTask, tags: newTags});
                    }} className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors ${currentTask.tags.includes(tag) ? tagStyles[tag] : 'bg-black text-gray-500 border-white/10 hover:border-white/20 hover:text-white'}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
  
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Description</label>
                <textarea rows="4" value={currentTask.description} onChange={(e) => setCurrentTask({...currentTask, description: e.target.value})} className="w-full px-4 py-3 bg-black border border-white/10 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9df01c]" placeholder="Add more details about this task..." />
              </div>
  
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Attachments</label>
                <div className="space-y-3">
                  <label className={`flex flex-col items-center justify-center w-full h-24 border border-white/10 border-dashed rounded-xl cursor-pointer bg-black hover:bg-white/5 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {isUploading ? <RefreshCw className="w-6 h-6 text-[#9df01c] mb-2 animate-spin" /> : <Upload className="w-6 h-6 text-gray-500 mb-2" />}
                      <p className="text-sm text-gray-400">
                         {isUploading ? <span className="font-bold text-[#9df01c]">Uploading to server...</span> : <><span className="font-bold text-white">Click to upload</span> or drag and drop</>}
                      </p>
                    </div>
                    <input type="file" className="hidden" multiple onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                  
                  {currentTask.files && currentTask.files.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {currentTask.files.map((file, index) => (
                        <div key={index} className="relative group rounded-xl overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center">
                          {file.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) || file.url.startsWith('data:image') ? (
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center p-2 text-center">
                              <FileText size={24} className="text-gray-500 mb-1" />
                              <span className="text-[10px] text-gray-400 truncate w-full">{file.name}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <a href={`${API_URL}?action=download&file=${encodeURIComponent(file.url)}&name=${encodeURIComponent(file.name)}`} title="Download" className="p-2 bg-[#111] text-white rounded-lg hover:bg-white/10 hover:text-[#9df01c] border border-white/10"><Download size={14} /></a>
                             <button type="button" onClick={() => removeFile(index)} className="p-2 bg-[#111] text-white rounded-lg hover:bg-red-500/20 hover:text-red-500 border border-white/10"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
  
              {currentTask.status === 'done' && currentTask.completedAt && (
                 <div className="mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle className="text-emerald-400 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                       <h4 className="font-black uppercase tracking-widest text-emerald-400 text-[10px] mb-1">Task Completed</h4>
                       <p className="text-emerald-500/70 text-xs">
                          Marked complete on {new Date(currentTask.completedAt).toLocaleString()}
                          {currentTask.completedBy && users.find(u => u.id === currentTask.completedBy) && (
                             <> by <span className="text-emerald-400 font-bold">{users.find(u => u.id === currentTask.completedBy).name}</span></>
                          )}
                       </p>
                    </div>
                 </div>
              )}
  
              <div className="pt-6 mt-6 border-t border-white/10">
                <h4 className="text-sm font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2"><MessageSquare size={16} className="text-[#9df01c]"/> Discussion</h4>
                
                <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {currentTask.comments && currentTask.comments.length > 0 ? (
                    currentTask.comments.map((comment) => {
                      const commentUser = getUser(comment.userId);
                      return (
                        <div key={comment.id} className="flex gap-3">
                          {commentUser?.avatarUrl ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                                <img src={commentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <UserCircle size={32} className="text-gray-600 flex-shrink-0" />
                          )}
                          <div className="flex-1 bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-gray-300">{commentUser?.name || 'Unknown User'}</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{new Date(comment.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-400 whitespace-pre-wrap">{comment.text}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center p-6 bg-black rounded-xl border border-white/5">No comments yet. Start the discussion!</div>
                  )}
                </div>
  
                <div className="flex gap-3">
                   {currentUser?.avatarUrl ? (
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 mt-1">
                          <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <UserCircle size={32} className="text-gray-600 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1 flex flex-col items-end gap-3">
                      <textarea
                        rows="2"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Ask a question, post an update..."
                        className="w-full px-4 py-3 bg-black border border-white/10 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9df01c] text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddComment}
                        disabled={!newCommentText.trim() || !currentTask.id}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${!newCommentText.trim() || !currentTask.id ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-[#9df01c] hover:bg-[#8ce015] text-black'}`}
                      >
                        {currentTask.id ? 'Post Comment' : 'Save task to comment'}
                      </button>
                    </div>
                </div>
              </div>
  
            </form>
          </div>
          <div className="p-6 border-t border-white/5 bg-[#0a0a0a] flex justify-end gap-3 flex-shrink-0">
            {currentTask.id && <button type="button" onClick={() => handleDeleteTask(currentTask.id)} className="px-4 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors mr-auto">Delete</button>}
            <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-colors font-black uppercase tracking-widest text-[10px]">Cancel</button>
            <button type="submit" form="taskForm" className="px-6 py-2.5 bg-[#9df01c] hover:bg-[#8ce015] text-black rounded-xl transition-colors font-black uppercase tracking-widest text-[10px]" disabled={isUploading}>{currentTask.id ? 'Save Changes' : 'Create Task'}</button>
          </div>
        </div>
      </div>
    );
  }

function ProjectModal({ editingProject, setEditingProject, handleSaveProject, handleArchiveProject, handlePermanentDeleteProject, setIsProjectModalOpen }) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-white/10">
          <div className="flex justify-between items-center p-6 border-b border-white/5">
            <h3 className="font-black uppercase italic tracking-tighter text-lg text-white">{editingProject.id ? 'Edit Project' : 'New Project'}</h3>
            <button onClick={() => setIsProjectModalOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
          </div>
          <form id="projectForm" onSubmit={handleSaveProject} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Project Name</label>
              <input required type="text" value={editingProject.name} onChange={(e) => setEditingProject({...editingProject, name: e.target.value})} className="w-full px-4 py-3 bg-black border border-white/10 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9df01c]" placeholder="e.g., Website Redesign" />
            </div>
            
            <div>
               <label className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-black cursor-pointer hover:bg-white/5 transition-colors">
                 <div className="text-left">
                     <div className="text-xs font-bold uppercase tracking-widest text-gray-300 flex items-center gap-2 mb-1"><Shield size={14} className="text-amber-500"/> Admin Only Project</div>
                     <div className="text-[10px] font-bold text-gray-500">Only Admins can view this project and its tasks.</div>
                 </div>
                 <input type="checkbox" className="w-5 h-5 accent-[#9df01c] rounded cursor-pointer bg-black border-white/10" checked={editingProject.adminOnly || false} onChange={(e) => setEditingProject({...editingProject, adminOnly: e.target.checked})} />
               </label>
            </div>
  
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Project Color</label>
              <div className="flex flex-wrap gap-4">
                {availableColors.map(color => (
                  <button key={color} type="button" onClick={() => setEditingProject({...editingProject, color})} className={`w-8 h-8 rounded-full transition-transform ${colorStyles[color].bar} ${editingProject.color === color ? 'ring-2 ring-offset-2 ring-offset-[#111] ring-white scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`} aria-label={color} />
                ))}
              </div>
            </div>
  
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Project Icon</label>
              <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-3 border border-white/10 rounded-xl bg-black custom-scrollbar">
                {availableIcons.map(iconName => (
                  <button key={iconName} type="button" onClick={() => setEditingProject({...editingProject, icon: iconName})} className={`p-2.5 rounded-lg flex items-center justify-center transition-colors ${editingProject.icon === iconName ? 'bg-[#9df01c]/10 text-[#9df01c] border border-[#9df01c]/20' : 'bg-transparent text-gray-500 border border-transparent hover:border-white/10 hover:text-white hover:bg-white/5'}`}>
                    <DynamicIcon name={iconName} size={20} />
                  </button>
                ))}
              </div>
            </div>
          </form>
          <div className="p-6 border-t border-white/5 bg-[#0a0a0a] flex justify-end gap-3">
            {editingProject.id && (
              editingProject.isArchived 
                ? <button type="button" onClick={() => handlePermanentDeleteProject(editingProject.id)} className="px-4 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors mr-auto">Delete Forever</button>
                : <button type="button" onClick={() => handleArchiveProject(editingProject, true)} className="px-4 py-2.5 text-amber-500 hover:bg-amber-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors mr-auto">Archive</button>
            )}
            <button type="button" onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">Cancel</button>
            <button type="submit" form="projectForm" className="px-6 py-2.5 bg-[#9df01c] hover:bg-[#8ce015] text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">{editingProject.id ? 'Save' : 'Create Project'}</button>
          </div>
        </div>
      </div>
    );
  }

// --- MAIN APPLICATION COMPONENT ---
export default function TaskManagerApp({ session, unaData, activeTab }) {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]); 
    const [isLoading, setIsLoading] = useState(true);

    const [activeProjectId, setActiveProjectId] = useState(null);
    const [viewMode, setViewMode] = useState('board'); 
    
    // Modal States
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState({ name: '', color: 'blue', icon: 'Briefcase', adminOnly: false });
    
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState({ title: '', description: '', status: 'todo', dueDate: '', assigneeId: '', tags: [], files: [], comments: [] });
    
    const [isUploading, setIsUploading] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');

    const currentUser = {
        id: unaData?.user?.id || 'me',
        name: unaData?.user?.name || 'Me',
        avatarUrl: unaData?.user?.avatar || null
    };

    const fetchTaskData = async () => {
        try {
            const teamRes = await fetch('/api/team', { headers: { 'Authorization': `Bearer ${session}` } });
            const teamData = await teamRes.json();
            
            let fetchedUsers = [currentUser]; 
            
            if (teamData.teammates) {
                teamData.teammates.forEach(tm => {
                    const prof = teamData.profiles?.[tm.teammate_email] || {};
                    if (tm.teammate_email !== unaData?.user?.email) {
                        fetchedUsers.push({
                            id: tm.teammate_email,
                            name: prof.name || tm.teammate_email,
                            avatarUrl: prof.avatar || null
                        });
                    }
                });
            }
            setUsers(fetchedUsers);

            const res = await fetch('/api/tasks/data', { headers: { 'Authorization': `Bearer ${session}` } });
            const data = await res.json();
            
            if (data.success) {
                setProjects(data.projects || []);
                setTasks(data.tasks || []);
                if (data.projects?.length > 0 && !activeProjectId) {
                    const firstActive = data.projects.find(p => !p.isArchived);
                    if (firstActive) setActiveProjectId(firstActive.id);
                }
            }
        } catch (e) {
            console.error("Failed to load task data", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session) fetchTaskData();
    }, [session]);

    // --- PROJECT ACTIONS ---
    const handleSaveProject = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/tasks/projects/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session}` },
                body: JSON.stringify(editingProject)
            });
            const data = await res.json();
            if (data.success) {
                fetchTaskData();
                setIsProjectModalOpen(false);
                if (!editingProject.id) setActiveProjectId(data.id);
            }
        } catch(e) { alert("Failed to save project."); }
    };

    const handleArchiveProject = async (proj, isArchived) => {
        try {
            await fetch('/api/tasks/projects/archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session}` },
                body: JSON.stringify({ id: proj.id, isArchived })
            });
            fetchTaskData();
            setIsProjectModalOpen(false);
            if (activeProjectId === proj.id && isArchived) setActiveProjectId(null);
        } catch(e) {}
    };

    const handlePermanentDeleteProject = async (id) => {
        try {
            await fetch('/api/tasks/projects/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session}` },
                body: JSON.stringify({ id })
            });
            fetchTaskData();
            setIsProjectModalOpen(false);
            if (activeProjectId === id) setActiveProjectId(null);
        } catch(e) {}
    };

    // --- TASK ACTIONS ---
    const openTaskModal = (task = null, projId = null, initialStatus = 'todo') => {
        if (task) {
            setCurrentTask(task);
        } else {
            setCurrentTask({ 
                title: '', description: '', status: initialStatus, 
                dueDate: '', assigneeId: '', tags: [], files: [], comments: [],
                projectId: projId || activeProjectId 
            });
        }
        setNewCommentText('');
        setIsTaskModalOpen(true);
    };

    const handleSaveTask = async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/tasks/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session}` },
                body: JSON.stringify(currentTask)
            });
            fetchTaskData();
            setIsTaskModalOpen(false);
        } catch(e) { alert("Failed to save task."); }
    };

    const handleDeleteTask = async (id) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        try {
            await fetch('/api/tasks/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session}` },
                body: JSON.stringify({ id })
            });
            fetchTaskData();
            setIsTaskModalOpen(false);
        } catch(e) {}
    };

    const handleToggleTaskStatus = async (task) => {
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        try {
            await fetch('/api/tasks/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session}` },
                body: JSON.stringify({ ...task, status: newStatus })
            });
            fetchTaskData();
        } catch(e) {}
    };

    const handleAddComment = async () => {
        if (!newCommentText.trim() || !currentTask.id) return;
        try {
            await fetch('/api/tasks/comments/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session}` },
                body: JSON.stringify({ taskId: currentTask.id, text: newCommentText })
            });
            setNewCommentText('');
            fetchTaskData();
            
            const newComment = { id: Date.now(), userId: currentUser.id, text: newCommentText, timestamp: new Date().toISOString() };
            setCurrentTask(prev => ({ ...prev, comments: [...(prev.comments||[]), newComment] }));
        } catch(e) {}
    };

    // --- DRAG AND DROP HANDLERS ---
    const handleDragStart = (e, taskId) => { e.dataTransfer.setData('taskId', taskId); };
    const handleDragOver = (e) => { e.preventDefault(); };
    
    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        const taskId = parseInt(e.dataTransfer.getData('taskId'));
        const task = tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
            const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
            setTasks(updatedTasks);
            
            try {
                await fetch('/api/tasks/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session}` },
                    body: JSON.stringify({ ...task, status: newStatus })
                });
            } catch(err) { fetchTaskData(); }
        }
    };

    const handleReorderTasks = async (updatedList) => {
        const newTasks = tasks.map(t => {
            const found = updatedList.find(ut => ut.id === t.id);
            return found ? found : t;
        });
        setTasks(newTasks);

        try {
            await fetch('/api/tasks/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session}` },
                body: JSON.stringify({ tasks: updatedList.map(t => ({ id: t.id, sortOrder: t.sortOrder, status: t.status })) })
            });
        } catch(err) { fetchTaskData(); }
    };

    // --- FILE UPLOADS ---
    const handleFileUpload = async (e) => {
        const uploadFiles = Array.from(e.target.files);
        if (!uploadFiles.length) return;
        setIsUploading(true);
        
        const uploaded = [];
        for (const file of uploadFiles) {
            const formData = new FormData();
            formData.append('fileToUpload', file);
            try {
                const res = await fetch(`${API_URL}?action=upload`, { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) uploaded.push({ name: file.name, url: data.fileUrl });
            } catch (err) { console.error("Upload failed", err); }
        }
        
        setCurrentTask(prev => ({ ...prev, files: [...(prev.files || []), ...uploaded] }));
        setIsUploading(false);
    };

    const removeFile = (indexToRemove) => {
        setCurrentTask(prev => ({
            ...prev,
            files: prev.files.filter((_, idx) => idx !== indexToRemove)
        }));
    };

    if (isLoading) return <div className="flex h-full items-center justify-center text-[#9df01c]"><Loader2 className="w-8 h-8 animate-spin"/></div>;

    // --- ARCHIVED PROJECTS VIEW ---
    if (activeTab === 'archived') {
        const archivedProjects = projects.filter(p => p.isArchived);
        return (
            <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden font-sans">
                <div className="p-6 sm:p-8 h-full overflow-y-auto w-full custom-scrollbar">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                        <div>
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white flex items-center gap-2">
                                <Archive className="text-gray-500" size={28} /> Archived Projects
                            </h2>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Restore or permanently delete completed projects.</p>
                        </div>
                    </div>

                    <div className="bg-[#111] rounded-3xl border border-white/5 overflow-hidden">
                        {archivedProjects.length === 0 ? (
                            <div className="p-16 text-center flex flex-col items-center">
                                <Archive size={48} className="text-gray-700 mb-4" />
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No archived projects found.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-black border-b border-white/5">
                                    <tr>
                                        <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Project Name</th>
                                        <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-32 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {archivedProjects.map(project => (
                                        <tr key={project.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                <div className="font-bold text-white flex items-center gap-2">
                                                    <DynamicIcon name={project.icon} size={16} className={colorStyles[project.color]?.text} />
                                                    {project.name}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleArchiveProject(project, false)} className="p-2 text-[#9df01c] hover:bg-[#9df01c]/10 rounded-lg transition-colors" title="Restore Project">
                                                        <RotateCcw size={16} />
                                                    </button>
                                                    <button onClick={() => { if(window.confirm(`Permanently delete "${project.name}" and all of its tasks? This cannot be undone.`)) handlePermanentDeleteProject(project.id); }} className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Permanently Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const activeProject = projects.find(p => p.id === activeProjectId);
    const activeProjectTasks = tasks.filter(t => t.projectId === activeProjectId && t.status !== 'done').sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const completedProjectTasks = tasks.filter(t => t.projectId === activeProjectId && t.status === 'done').sort((a,b) => new Date(b.dueDate) - new Date(a.dueDate));

    return (
        <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-[#0a0a0a] border-b border-white/5 px-6 py-4 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pr-4">
                    {projects.filter(p => !p.isArchived).map(proj => (
                        <button 
                            key={proj.id} 
                            onClick={() => setActiveProjectId(proj.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeProjectId === proj.id ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'bg-black text-gray-500 border border-white/5 hover:bg-white/5 hover:text-gray-300'}`}
                        >
                            <DynamicIcon name={proj.icon} size={14} className={activeProjectId === proj.id ? 'text-[#9df01c]' : colorStyles[proj.color]?.text} />
                            {proj.name}
                        </button>
                    ))}
                    <button onClick={() => { setEditingProject({ name: '', color: 'blue', icon: 'Briefcase', adminOnly: false }); setIsProjectModalOpen(true); }} className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white/5 hover:text-white border border-white/10 border-dashed rounded-xl transition-colors whitespace-nowrap ml-2">
                        <Plus size={14} /> New Project
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {activeProject ? (
                <div className="flex-1 overflow-hidden flex flex-col p-6">
                    
                    {/* Project Header & Controls */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-black border ${colorStyles[activeProject.color]?.border}`}>
                                    <DynamicIcon name={activeProject.icon} size={20} className={colorStyles[activeProject.color]?.text} />
                                </div>
                                {activeProject.name}
                            </h2>
                            <button 
                                onClick={() => { setEditingProject(activeProject); setIsProjectModalOpen(true); }} 
                                className="text-gray-500 hover:text-[#9df01c] transition-colors p-2 bg-black border border-white/5 rounded-lg hover:border-white/10"
                                title="Project Settings"
                            >
                                <Settings size={16} />
                            </button>
                        </div>

                        <div className="flex items-center gap-1.5 bg-black p-1.5 rounded-xl border border-white/10">
                            <button onClick={() => setViewMode('board')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'board' ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-300'}`}>Board</button>
                            <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-300'}`}>List</button>
                        </div>
                    </div>

                    {/* Views Container */}
                    <div className="flex-1 overflow-hidden min-h-0">
                        
                        {/* KANBAN BOARD VIEW */}
                        {viewMode === 'board' && (
                            <div className="flex gap-6 h-full overflow-x-auto pb-4 custom-scrollbar">
                                {['todo', 'in-progress', 'done'].map(status => (
                                <div key={status} className="bg-[#111] rounded-3xl w-80 min-w-[20rem] p-4 flex flex-col h-full border border-white/5" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, status)}>
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h3 className="font-black uppercase tracking-widest text-xs text-gray-400">{status === 'in-progress' ? 'In Progress' : status.replace('-', ' ')}</h3>
                                        <span className="bg-black text-gray-500 text-[10px] py-1 px-2.5 rounded-lg font-bold border border-white/10">{tasks.filter(t => t.projectId === activeProject.id && t.status === status).length}</span>
                                    </div>
                                    
                                    <button onClick={() => openTaskModal(null, activeProject.id, status)} className="mb-3 w-full py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors border border-dashed border-white/10 hover:border-white/20">
                                        <Plus size={14} /> Add Task
                                    </button>

                                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                        {tasks.filter(t => t.projectId === activeProject.id && t.status === status).sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(task => {
                                            const assignee = users?.find(u => u.id === task.assigneeId);
                                            const taskIsOverdue = isOverdue(task.dueDate, task.status);
                                            return (
                                                <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} className={`bg-black p-5 rounded-2xl border cursor-grab active:cursor-grabbing transition-all group ${taskIsOverdue ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-white/5 hover:border-white/20'}`}>
                                                    <div className="flex items-start gap-2.5 mb-3">
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleTaskStatus(task); }} className="mt-0.5 flex-shrink-0 cursor-pointer text-gray-600 hover:text-[#9df01c] transition-colors">
                                                            {task.status === 'done' ? <CheckCircle size={18} className="text-[#9df01c]" /> : <Circle size={18} />}
                                                        </button>
                                                        <p className={`font-medium text-sm cursor-pointer transition-colors leading-tight pt-0.5 ${task.status === 'done' ? 'text-gray-600 line-through' : 'text-gray-200 hover:text-[#9df01c]'}`} onClick={() => openTaskModal(task)}>{task.title}</p>
                                                    </div>
                                                    
                                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                                        <TagDisplay tags={task.tags} />
                                                        {task.files && task.files.length > 0 && <span className="flex items-center text-gray-400 bg-white/5 p-1.5 rounded-lg border border-white/5" title="Has Attachments"><Paperclip size={12} /></span>}
                                                        {task.comments && task.comments.length > 0 && <span className="flex items-center gap-1.5 text-gray-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5 text-[10px] font-bold" title="Comments"><MessageSquare size={12} /> {task.comments.length}</span>}
                                                    </div>

                                                    <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-white/5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider border ${taskIsOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-white/5 text-gray-400 border-white/5'}`}><Clock size={10} /> {formatDate(task.dueDate)}</span>
                                                            {assignee && (
                                                                <span className="flex items-center gap-1.5 text-gray-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5 font-bold text-[10px]" title={assignee.name}>
                                                                    {assignee.avatarUrl ? <img src={assignee.avatarUrl} alt="Avatar" className="w-4 h-4 rounded-md object-cover" /> : <UserCircle size={14} className="text-gray-600"/>}
                                                                    <span className="max-w-[60px] truncate">{assignee.name.split(' ')[0]}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button onClick={() => handleDeleteTask(task.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                                ))}
                            </div>
                        )}

                        {/* LIST VIEW */}
                        {viewMode === 'list' && (
                            <div className="h-full overflow-y-auto pr-1 pb-8 custom-scrollbar">
                                <div className="bg-[#111] rounded-3xl border border-white/5 overflow-hidden mb-8">
                                    <div className="md:hidden flex flex-col divide-y divide-white/5">
                                        {activeProjectTasks.length > 0 
                                            ? activeProjectTasks.map((t, i) => (
                                                <TaskMobileCard key={t.id} task={t} users={users} handleToggleTaskStatus={handleToggleTaskStatus} openTaskModal={openTaskModal} handleDeleteTask={handleDeleteTask} />
                                            )) 
                                            : <div className="p-8 text-center text-gray-600 text-[10px] font-bold uppercase tracking-widest">No active tasks in this project.</div>
                                        }
                                    </div>
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-left min-w-[600px]">
                                            <thead className="bg-black border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                <tr><th className="p-4 w-16 pr-1"></th><th className="py-4 px-2 w-8"></th><th className="p-4">Task Name</th><th className="p-4">Assignee</th><th className="p-4">Due Date</th></tr>
                                            </thead>
                                            <tbody>
                                                {activeProjectTasks.length > 0 
                                                    ? activeProjectTasks.map((t, i) => (
                                                        <TaskDesktopRow key={t.id} task={t} users={users} handleToggleTaskStatus={handleToggleTaskStatus} openTaskModal={openTaskModal} handleDeleteTask={handleDeleteTask} />
                                                    )) 
                                                    : <tr><td colSpan="5" className="p-12 text-center text-gray-600 text-[10px] font-bold uppercase tracking-widest">No active tasks in this project.</td></tr>
                                                }
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {completedProjectTasks.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-4 pl-2">
                                            <span className="px-3 py-1 bg-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Completed</span>
                                            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{completedProjectTasks.length} tasks</span>
                                        </div>
                                        <div className="bg-[#111]/60 rounded-3xl border border-white/5 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                                            <div className="md:hidden flex flex-col divide-y divide-white/5">
                                                {completedProjectTasks.map(t => <TaskMobileCard key={t.id} task={t} users={users} handleToggleTaskStatus={handleToggleTaskStatus} openTaskModal={openTaskModal} handleDeleteTask={handleDeleteTask}/>)}
                                            </div>
                                            <div className="hidden md:block overflow-x-auto">
                                                <table className="w-full text-left min-w-[600px]">
                                                    <tbody>
                                                        {completedProjectTasks.map(t => <TaskDesktopRow key={t.id} task={t} users={users} handleToggleTaskStatus={handleToggleTaskStatus} openTaskModal={openTaskModal} handleDeleteTask={handleDeleteTask}/>)}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-24 h-24 bg-[#111] border border-white/5 rounded-full flex items-center justify-center mb-6 text-gray-600">
                        <Briefcase size={36} />
                    </div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">No Projects Found</h3>
                    <p className="text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest max-w-sm mb-8 leading-relaxed">Create your first project to start organizing tasks, attaching files, and collaborating with your team.</p>
                    <button onClick={() => { setEditingProject({ name: '', color: 'blue', icon: 'Briefcase', adminOnly: false }); setIsProjectModalOpen(true); }} className="px-8 py-4 bg-[#9df01c] hover:bg-[#8ce015] text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Create Project
                    </button>
                </div>
            )}

            {/* MODALS */}
            {isProjectModalOpen && (
                <ProjectModal 
                    editingProject={editingProject} 
                    setEditingProject={setEditingProject} 
                    handleSaveProject={handleSaveProject} 
                    handleArchiveProject={handleArchiveProject}
                    handlePermanentDeleteProject={handlePermanentDeleteProject} 
                    setIsProjectModalOpen={setIsProjectModalOpen} 
                />
            )}

            {isTaskModalOpen && (
                <TaskModal 
                    currentTask={currentTask} 
                    setCurrentTask={setCurrentTask} 
                    handleSaveTask={handleSaveTask} 
                    handleDeleteTask={handleDeleteTask} 
                    setIsTaskModalOpen={setIsTaskModalOpen}
                    users={users} 
                    isUploading={isUploading} 
                    handleFileUpload={handleFileUpload} 
                    removeFile={removeFile}
                    newCommentText={newCommentText} 
                    setNewCommentText={setNewCommentText} 
                    handleAddComment={handleAddComment} 
                    currentUser={currentUser} 
                />
            )}
        </div>
    );
}