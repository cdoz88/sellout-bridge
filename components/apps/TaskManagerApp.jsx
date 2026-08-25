import React, { useState, useEffect } from 'react';
import { LayoutDashboard, CheckCircle, Circle, Clock, Trash2, Paperclip, MessageSquare, Plus, GripVertical, X, Shield, Upload, RefreshCw, FileText, Download, UserCircle, Search, Archive, RotateCcw, Target, Briefcase, Zap, Globe, Layout, Monitor, Smartphone, Server, Database, Code, PenTool, Hash, Star } from 'lucide-react';

// --- INLINED CONSTANTS & HELPERS ---
const API_URL = 'https://api.fytsolutions.com/api.php';

const availableTags = ['Bug', 'Feature', 'Enhancement', 'Design', 'Content', 'Marketing', 'Urgent', 'Low Priority', 'Review'];

const tagStyles = {
  'Bug': 'bg-red-100 text-red-700 border-red-200',
  'Feature': 'bg-blue-100 text-blue-700 border-blue-200',
  'Enhancement': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Design': 'bg-purple-100 text-purple-700 border-purple-200',
  'Content': 'bg-amber-100 text-amber-700 border-amber-200',
  'Marketing': 'bg-pink-100 text-pink-700 border-pink-200',
  'Urgent': 'bg-rose-100 text-rose-700 border-rose-200 font-bold',
  'Low Priority': 'bg-slate-100 text-slate-600 border-slate-200',
  'Review': 'bg-cyan-100 text-cyan-700 border-cyan-200'
};

const availableColors = ['blue', 'emerald', 'rose', 'amber', 'purple', 'cyan', 'slate'];

const colorStyles = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', bar: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', bar: 'bg-emerald-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', bar: 'bg-rose-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', bar: 'bg-amber-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', bar: 'bg-purple-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', bar: 'bg-cyan-500' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', bar: 'bg-slate-500' }
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

const calculateProjectProgress = (projectId, allTasks) => {
    const pTasks = allTasks.filter(t => t.projectId === projectId);
    if (pTasks.length === 0) return 0;
    const done = pTasks.filter(t => t.status === 'done').length;
    return Math.round((done / pTasks.length) * 100);
};

// --- SUBCOMPONENTS ---

function TagDisplay({ tags }) {
    if (!tags || tags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map(tag => (
          <span key={tag} className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold whitespace-nowrap ${tagStyles[tag] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
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
      className={`p-4 transition-colors group border-b border-slate-100 last:border-b-0 ${isDragged ? 'opacity-50 bg-blue-50' : 'hover:bg-slate-50'}`}
    >
      <div className="flex items-start gap-2 mb-2">
        {draggable && (
           <div onMouseEnter={() => setIsDragReady(true)} onMouseLeave={() => setIsDragReady(false)} onTouchStart={() => setIsDragReady(true)} onTouchEnd={() => setIsDragReady(false)} className="cursor-grab active:cursor-grabbing p-1 -ml-2 mt-0.5 text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0">
             <GripVertical size={16} />
           </div>
        )}
        <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleTaskStatus(task); }} className="mt-1 flex-shrink-0 p-0.5 block" >
            {task.status === 'done' ? <CheckCircle size={18} className="text-[#9df01c]" /> : <Circle size={18} className="text-slate-300 hover:text-blue-500" />}
        </button>
        <div className={`mt-2 w-2.5 h-2.5 rounded-full flex-shrink-0 ${task.status === 'done' ? 'bg-[#9df01c]' : task.status === 'in-progress' ? 'bg-amber-400' : 'bg-slate-300'}`} />
        <div className={`flex-1 font-medium cursor-pointer transition-colors leading-tight pt-1 ml-0.5 ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700 hover:text-blue-600'}`} onClick={(e) => { e.stopPropagation(); openTaskModal(task); }}>
          {task.title}
        </div>
      </div>
      <div className="pl-8 flex flex-wrap items-center gap-x-3 gap-y-2">
        <TagDisplay tags={task.tags} />
        {task.files && task.files.length > 0 && <span className="flex items-center text-slate-400 bg-slate-100 p-1 rounded-md border border-slate-200" title="Has Attachments"><Paperclip size={14} /></span>}
        {task.comments && task.comments.length > 0 && <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 text-[10px] font-bold" title="Comments"><MessageSquare size={12} /> {task.comments.length}</span>}
        
        {assignee && (
          <span className={`flex items-center gap-1.5 text-xs font-medium ${task.status === 'done' ? 'text-slate-400' : 'text-slate-600'}`}>
            {assignee.avatarUrl ? <img src={assignee.avatarUrl} alt="Avatar" className={`w-4 h-4 rounded-full object-cover ${task.status === 'done' ? 'grayscale opacity-60' : ''}`} /> : <UserCircle size={14} className={task.status === 'done' ? 'text-slate-300' : 'text-slate-400'} />}
            {assignee.name.split(' ')[0]}
          </span>
        )}
        
        <div className="flex items-center gap-3 ml-auto">
          <div className={`text-xs flex items-center gap-1 whitespace-nowrap ${taskIsOverdue ? 'text-red-500 font-bold' : 'text-slate-500'} ${task.status === 'done' ? 'text-slate-400' : ''}`}>
            <Clock size={12} className={taskIsOverdue ? 'text-red-500' : 'text-slate-400'} />{formatDate(task.dueDate)}
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="text-slate-300 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1">
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
    <tr draggable={draggable && isDragReady} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} className={`border-b border-slate-100 transition-colors group ${isDragged ? 'opacity-50 bg-blue-50' : 'hover:bg-slate-50'}`}>
      <td className="p-4 w-16 pr-1 align-middle">
        <div className="flex items-center h-full gap-1">
          {draggable && (
            <div onMouseEnter={() => setIsDragReady(true)} onMouseLeave={() => setIsDragReady(false)} onTouchStart={() => setIsDragReady(true)} onTouchEnd={() => setIsDragReady(false)} className="cursor-grab active:cursor-grabbing p-1 -ml-2 text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0">
               <GripVertical size={16} />
            </div>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleTaskStatus(task); }} className="cursor-pointer flex-shrink-0 p-1 block mt-0.5">
            {task.status === 'done' ? <CheckCircle size={18} className="text-[#9df01c]" /> : <Circle size={18} className="text-slate-300 hover:text-blue-500" />}
          </button>
        </div>
      </td>
      <td className="py-4 px-2 w-8 align-middle">
        <div className={`w-2.5 h-2.5 rounded-full ${task.status === 'done' ? 'bg-[#9df01c]' : task.status === 'in-progress' ? 'bg-amber-400' : 'bg-slate-300'}`} title={task.status} />
      </td>
      <td className="p-4 align-middle">
        <div className={`font-medium cursor-pointer transition-colors w-fit ${task.status === 'done' ? 'text-slate-400 line-through hover:text-blue-400' : 'text-slate-700 hover:text-blue-600'}`} onClick={(e) => { e.stopPropagation(); openTaskModal(task); }}>
          {task.title}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <TagDisplay tags={task.tags} />
          {task.files && task.files.length > 0 && <span className="flex items-center text-slate-400 bg-slate-100 p-1 rounded-md border border-slate-200" title="Has Attachments"><Paperclip size={14} /></span>}
          {task.comments && task.comments.length > 0 && <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 text-[10px] font-bold" title="Comments"><MessageSquare size={12} /> {task.comments.length}</span>}
        </div>
      </td>
      <td className="p-4 text-sm text-slate-600 whitespace-nowrap align-middle">
        {assignee && (
          <span className={`flex items-center gap-1.5 ${task.status === 'done' ? 'opacity-60 grayscale' : ''}`}>
            {assignee.avatarUrl ? <img src={assignee.avatarUrl} alt="Avatar" className="w-5 h-5 rounded-full object-cover" /> : <UserCircle size={16} className="text-slate-400" />}
            {assignee.name.split(' ')[0]}
          </span>
        )}
      </td>
      <td className={`p-4 text-sm flex items-center justify-between whitespace-nowrap align-middle ${taskIsOverdue ? 'text-red-500 font-bold' : 'text-slate-600'} ${task.status === 'done' ? 'text-slate-400' : ''}`}>
        <span className="flex items-center gap-1"><Clock size={14} className={taskIsOverdue ? 'text-red-500' : 'text-slate-400'} />{formatDate(task.dueDate)}</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="text-slate-300 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 ml-4" title="Delete Task">
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
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border-t-4 border-t-blue-600">
          <div className="flex justify-between items-center p-6 border-b border-slate-100 flex-shrink-0">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <CheckCircle className="text-blue-600" size={20} />
              {currentTask.id ? 'Edit Task' : 'New Task'}
            </h3>
            <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
          </div>
          <div className="overflow-y-auto flex-1 p-6">
            <form id="taskForm" onSubmit={handleSaveTask} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                <input required type="text" value={currentTask.title} onChange={(e) => setCurrentTask({...currentTask, title: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What needs to be done?" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assignee</label>
                  <select value={currentTask.assigneeId || ''} onChange={(e) => setCurrentTask({...currentTask, assigneeId: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input type="date" value={currentTask.dueDate} onChange={(e) => setCurrentTask({...currentTask, dueDate: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={currentTask.status} onChange={(e) => setCurrentTask({...currentTask, status: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
  
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button key={tag} type="button" onClick={() => {
                      const newTags = currentTask.tags.includes(tag) ? currentTask.tags.filter(t => t !== tag) : [...currentTask.tags, tag];
                      setCurrentTask({...currentTask, tags: newTags});
                    }} className={`px-2 py-1 rounded border text-xs font-semibold transition-colors ${currentTask.tags.includes(tag) ? tagStyles[tag] : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
  
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea rows="4" value={currentTask.description} onChange={(e) => setCurrentTask({...currentTask, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Add more details about this task..." />
              </div>
  
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Attachments</label>
                <div className="space-y-3">
                  <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {isUploading ? <RefreshCw className="w-6 h-6 text-blue-500 mb-2 animate-spin" /> : <Upload className="w-6 h-6 text-slate-400 mb-2" />}
                      <p className="text-sm text-slate-500">
                         {isUploading ? <span className="font-semibold text-blue-600">Uploading to server...</span> : <><span className="font-semibold">Click to upload</span> or drag and drop</>}
                      </p>
                    </div>
                    <input type="file" className="hidden" multiple onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                  
                  {currentTask.files && currentTask.files.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {currentTask.files.map((file, index) => (
                        <div key={index} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-video flex items-center justify-center">
                          {file.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) || file.url.startsWith('data:image') ? (
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center p-2 text-center">
                              <FileText size={24} className="text-slate-400 mb-1" />
                              <span className="text-[10px] text-slate-500 truncate w-full">{file.name}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <a href={`${API_URL}?action=download&file=${encodeURIComponent(file.url)}&name=${encodeURIComponent(file.name)}`} title="Download" className="p-1.5 bg-white text-slate-800 rounded-md hover:bg-blue-50 hover:text-blue-600"><Download size={14} /></a>
                             <button type="button" onClick={() => removeFile(index)} className="p-1.5 bg-white text-slate-800 rounded-md hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
  
              {currentTask.status === 'done' && currentTask.completedAt && (
                 <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                       <h4 className="font-bold text-emerald-800 text-sm">Task Completed</h4>
                       <p className="text-emerald-600 text-xs mt-1">
                          Marked complete on {new Date(currentTask.completedAt).toLocaleString()}
                          {currentTask.completedBy && users.find(u => u.id === currentTask.completedBy) && (
                             <> by <span className="font-semibold">{users.find(u => u.id === currentTask.completedBy).name}</span></>
                          )}
                       </p>
                    </div>
                 </div>
              )}
  
              <div className="pt-6 mt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><MessageSquare size={16} className="text-blue-500"/> Discussion</h4>
                
                <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
                  {currentTask.comments && currentTask.comments.length > 0 ? (
                    currentTask.comments.map((comment) => {
                      const commentUser = getUser(comment.userId);
                      return (
                        <div key={comment.id} className="flex gap-3">
                          {commentUser?.avatarUrl ? (
                            <img src={commentUser.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-white" />
                          ) : (
                            <UserCircle size={32} className="text-slate-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-bold text-slate-700">{commentUser?.name || 'Unknown User'}</span>
                              <span className="text-[10px] text-slate-400">{new Date(comment.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{comment.text}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-slate-400 italic text-center p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">No comments yet. Start the discussion!</div>
                  )}
                </div>
  
                <div className="flex gap-3">
                   {currentUser?.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-white border border-slate-200" />
                    ) : (
                      <UserCircle size={32} className="text-slate-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 flex flex-col items-end gap-2">
                      <textarea
                        rows="2"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Ask a question, post an update..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddComment}
                        disabled={!newCommentText.trim() || !currentTask.id}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${!newCommentText.trim() || !currentTask.id ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      >
                        {currentTask.id ? 'Post Comment' : 'Save task to comment'}
                      </button>
                    </div>
                </div>
              </div>
  
            </form>
          </div>
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
            {currentTask.id && <button type="button" onClick={() => handleDeleteTask(currentTask.id)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium mr-auto">Delete</button>}
            <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium">Cancel</button>
            <button type="submit" form="taskForm" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium" disabled={isUploading}>{currentTask.id ? 'Save Changes' : 'Create Task'}</button>
          </div>
        </div>
      </div>
    );
  }

function ProjectModal({ editingProject, setEditingProject, handleSaveProject, handleArchiveProject, handlePermanentDeleteProject, setIsProjectModalOpen }) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-6 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-800">{editingProject.id ? 'Edit Project' : 'New Project'}</h3>
            <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <form id="projectForm" onSubmit={handleSaveProject} className="p-6 overflow-y-auto space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
              <input required type="text" value={editingProject.name} onChange={(e) => setEditingProject({...editingProject, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Website Redesign" />
            </div>
            
            <div>
               <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                 <div className="text-left">
                     <div className="font-medium text-slate-700 flex items-center gap-2"><Shield size={16} className="text-amber-500"/> Admin Only Project</div>
                     <div className="text-xs text-slate-500 mt-0.5">Only Admins can view this project and its tasks.</div>
                 </div>
                 <input type="checkbox" className="w-5 h-5 accent-blue-600 rounded cursor-pointer" checked={editingProject.adminOnly || false} onChange={(e) => setEditingProject({...editingProject, adminOnly: e.target.checked})} />
               </label>
            </div>
  
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Project Color</label>
              <div className="flex flex-wrap gap-3">
                {availableColors.map(color => (
                  <button key={color} type="button" onClick={() => setEditingProject({...editingProject, color})} className={`w-8 h-8 rounded-full transition-transform ${colorStyles[color].bar} ${editingProject.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`} aria-label={color} />
                ))}
              </div>
            </div>
  
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Project Icon</label>
              <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                {availableIcons.map(iconName => (
                  <button key={iconName} type="button" onClick={() => setEditingProject({...editingProject, icon: iconName})} className={`p-2 rounded-lg flex items-center justify-center transition-colors ${editingProject.icon === iconName ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-white text-slate-500 border border-transparent hover:border-slate-300 hover:bg-slate-100'}`}>
                    <DynamicIcon name={iconName} size={20} />
                  </button>
                ))}
              </div>
            </div>
          </form>
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            {editingProject.id && (
              editingProject.isArchived 
                ? <button type="button" onClick={() => handlePermanentDeleteProject(editingProject.id)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium mr-auto">Delete Forever</button>
                : <button type="button" onClick={() => handleArchiveProject(editingProject)} className="px-4 py-2 text-amber-600 hover:bg-amber-50 rounded-lg font-medium mr-auto">Archive</button>
            )}
            <button type="button" onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">Cancel</button>
            <button type="submit" form="projectForm" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">{editingProject.id ? 'Save' : 'Create Project'}</button>
          </div>
        </div>
      </div>
    );
  }

// --- MAIN APPLICATION COMPONENT ---
export default function TaskManagerApp({ session, unaData }) {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]); // Array to hold team members for assignees
    const [isLoading, setIsLoading] = useState(true);

    const [activeProjectId, setActiveProjectId] = useState(null);
    const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'
    
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
            // 1. Fetch the team roster for the assignees list
            const teamRes = await fetch('/api/team', { headers: { 'Authorization': `Bearer ${session}` } });
            const teamData = await teamRes.json();
            
            let fetchedUsers = [currentUser]; // Always include yourself
            
            if (teamData.teammates) {
                teamData.teammates.forEach(tm => {
                    const prof = teamData.profiles?.[tm.teammate_email] || {};
                    // Map emails as user IDs so it links properly to the backend text fields
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

            // 2. Fetch the actual projects and tasks
            const res = await fetch('/api/tasks/data', { headers: { 'Authorization': `Bearer ${session}` } });
            const data = await res.json();
            
            if (data.success) {
                setProjects(data.projects || []);
                setTasks(data.tasks || []);
                if (data.projects?.length > 0 && !activeProjectId) {
                    setActiveProjectId(data.projects[0].id);
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
                setActiveProjectId(data.id);
            }
        } catch(e) { alert("Failed to save project."); }
    };

    const handleArchiveProject = async (proj) => {
        try {
            await fetch('/api/tasks/projects/archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session}` },
                body: JSON.stringify({ id: proj.id, isArchived: true })
            });
            fetchTaskData();
            setIsProjectModalOpen(false);
            if (activeProjectId === proj.id) setActiveProjectId(null);
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
            
            // Optimistically update the open modal
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
            // Optimistic update
            const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
            setTasks(updatedTasks);
            
            try {
                await fetch('/api/tasks/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session}` },
                    body: JSON.stringify({ ...task, status: newStatus })
                });
            } catch(err) { fetchTaskData(); } // Revert on failure
        }
    };

    const handleReorderTasks = async (updatedList) => {
        // Optimistic UI Update
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

    const activeProject = projects.find(p => p.id === activeProjectId);
    const activeProjectTasks = tasks.filter(t => t.projectId === activeProjectId && t.status !== 'done').sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const completedProjectTasks = tasks.filter(t => t.projectId === activeProjectId && t.status === 'done').sort((a,b) => new Date(b.dueDate) - new Date(a.dueDate));

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 rounded-tl-3xl shadow-2xl overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-4 overflow-x-auto custom-scrollbar pr-4">
                    {projects.filter(p => !p.isArchived).map(proj => (
                        <button 
                            key={proj.id} 
                            onClick={() => setActiveProjectId(proj.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeProjectId === proj.id ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                        >
                            <DynamicIcon name={proj.icon} size={16} className={activeProjectId === proj.id ? 'text-white' : colorStyles[proj.color]?.text} />
                            {proj.name}
                        </button>
                    ))}
                    <button onClick={() => { setEditingProject({ name: '', color: 'blue', icon: 'Briefcase', adminOnly: false }); setIsProjectModalOpen(true); }} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 border-dashed rounded-lg transition-colors whitespace-nowrap">
                        <Plus size={16} /> New Project
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {activeProject ? (
                <div className="flex-1 overflow-hidden flex flex-col p-6">
                    
                    {/* Project Header & Controls */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 gap-4 shrink-0">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <DynamicIcon name={activeProject.icon} size={24} className={colorStyles[activeProject.color]?.text} />
                                {activeProject.name}
                            </h2>
                            <div className="flex items-center gap-4 mt-2">
                                <button onClick={() => { setEditingProject(activeProject); setIsProjectModalOpen(true); }} className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">Project Settings</button>
                                <div className="h-4 w-px bg-slate-300"></div>
                                <div className="text-xs font-medium text-slate-500 flex items-center gap-1"><CheckCircle size={14}/> {calculateProjectProgress(activeProject.id, tasks)}% Complete</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button onClick={() => setViewMode('board')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'board' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Board</button>
                            <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>List</button>
                        </div>
                    </div>

                    {/* Views Container */}
                    <div className="flex-1 overflow-hidden min-h-0">
                        
                        {/* KANBAN BOARD VIEW */}
                        {viewMode === 'board' && (
                            <div className="flex gap-6 h-full overflow-x-auto pb-4 custom-scrollbar">
                                {['todo', 'in-progress', 'done'].map(status => (
                                <div key={status} className="bg-slate-100/80 rounded-xl w-80 min-w-[20rem] p-4 flex flex-col h-full border border-slate-200" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, status)}>
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h3 className="font-semibold text-slate-700 capitalize">{status === 'in-progress' ? 'In Progress' : status.replace('-', ' ')}</h3>
                                        <span className="bg-white text-slate-600 text-xs py-0.5 px-2 rounded-full font-bold shadow-sm border border-slate-200">{tasks.filter(t => t.projectId === activeProject.id && t.status === status).length}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                        {tasks.filter(t => t.projectId === activeProject.id && t.status === status).sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(task => {
                                            const assignee = users?.find(u => u.id === task.assigneeId);
                                            const taskIsOverdue = isOverdue(task.dueDate, task.status);
                                            return (
                                                <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} className={`bg-white p-4 rounded-lg shadow-sm border cursor-grab active:cursor-grabbing hover:border-blue-300 transition-colors group ${taskIsOverdue ? 'border-red-200' : 'border-slate-200'}`}>
                                                    <p className={`font-medium text-sm mb-2 cursor-pointer group-hover:text-blue-600 transition-colors ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`} onClick={() => openTaskModal(task)}>{task.title}</p>
                                                    
                                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                                        <TagDisplay tags={task.tags} />
                                                        {task.files && task.files.length > 0 && <span className="flex items-center text-slate-400 bg-slate-100 p-1 rounded-md border border-slate-200" title="Has Attachments"><Paperclip size={14} /></span>}
                                                        {task.comments && task.comments.length > 0 && <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 text-[10px] font-bold" title="Comments"><MessageSquare size={12} /> {task.comments.length}</span>}
                                                    </div>

                                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`flex items-center gap-1 px-2 py-1 rounded font-medium ${taskIsOverdue ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}><Clock size={12} /> {formatDate(task.dueDate)}</span>
                                                            {assignee && (
                                                                <span className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100" title={assignee.name}>
                                                                    {assignee.avatarUrl ? <img src={assignee.avatarUrl} alt="Avatar" className="w-4 h-4 rounded-full object-cover" /> : <UserCircle size={14}/>}
                                                                    <span className="max-w-[60px] truncate">{assignee.name.split(' ')[0]}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button onClick={() => handleDeleteTask(task.id)} className="text-slate-300 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <button onClick={() => openTaskModal(null, activeProject.id, status)} className="mt-4 w-full py-2 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors border border-dashed border-slate-300">
                                        <Plus size={16} /> Add Task
                                    </button>
                                </div>
                                ))}
                            </div>
                        )}

                        {/* LIST VIEW */}
                        {viewMode === 'list' && (
                            <div className="h-full overflow-y-auto pr-1 pb-8 custom-scrollbar">
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                                    <div className="md:hidden flex flex-col divide-y divide-slate-100">
                                        {activeProjectTasks.length > 0 
                                            ? activeProjectTasks.map((t, i) => (
                                                <TaskMobileCard key={t.id} task={t} showProject={false} users={users} handleToggleTaskStatus={handleToggleTaskStatus} openTaskModal={openTaskModal} handleDeleteTask={handleDeleteTask} />
                                            )) 
                                            : <div className="p-8 text-center text-slate-500 text-sm">No active tasks in this project.</div>
                                        }
                                    </div>
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-left min-w-[600px]">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                                <tr><th className="p-4 w-16 pr-1"></th><th className="py-4 px-2 w-8"></th><th className="p-4">Task Name</th><th className="p-4">Assignee</th><th className="p-4">Due Date</th></tr>
                                            </thead>
                                            <tbody>
                                                {activeProjectTasks.length > 0 
                                                    ? activeProjectTasks.map((t, i) => (
                                                        <TaskDesktopRow key={t.id} task={t} showProject={false} users={users} handleToggleTaskStatus={handleToggleTaskStatus} openTaskModal={openTaskModal} handleDeleteTask={handleDeleteTask} />
                                                    )) 
                                                    : <tr><td colSpan="5" className="p-8 text-center text-slate-500">No active tasks in this project.</td></tr>
                                                }
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {completedProjectTasks.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-md text-sm font-bold uppercase tracking-wider">Completed</span>
                                            <span className="text-slate-400 text-sm font-medium">{completedProjectTasks.length} tasks</span>
                                        </div>
                                        <div className="bg-white/60 rounded-xl shadow-sm border border-slate-200 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                                            <div className="md:hidden flex flex-col divide-y divide-slate-100">
                                                {completedProjectTasks.map(t => <TaskMobileCard key={t.id} task={t} showProject={false} users={users} handleToggleTaskStatus={handleToggleTaskStatus} openTaskModal={openTaskModal} handleDeleteTask={handleDeleteTask}/>)}
                                            </div>
                                            <div className="hidden md:block overflow-x-auto">
                                                <table className="w-full text-left min-w-[600px]">
                                                    <tbody>
                                                        {completedProjectTasks.map(t => <TaskDesktopRow key={t.id} task={t} showProject={false} users={users} handleToggleTaskStatus={handleToggleTaskStatus} openTaskModal={openTaskModal} handleDeleteTask={handleDeleteTask}/>)}
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
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm text-slate-300">
                        <Briefcase size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">No Projects Found</h3>
                    <p className="text-center text-sm max-w-sm mb-6 leading-relaxed">Create your first project to start organizing tasks, attaching files, and collaborating with your team.</p>
                    <button onClick={() => { setEditingProject({ name: '', color: 'blue', icon: 'Briefcase', adminOnly: false }); setIsProjectModalOpen(true); }} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
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