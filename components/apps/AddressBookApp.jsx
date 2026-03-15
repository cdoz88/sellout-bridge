import React, { useState, useEffect } from 'react';
import { Camera, Save, Loader2, Download, UploadCloud, X, Trash2, Plus, Users, ChevronLeft } from 'lucide-react';

export default function AddressBookApp() {
    const [contacts, setContacts] = useState([]);
    const [contactView, setContactView] = useState('list'); 
    const [editingContact, setEditingContact] = useState(null);
    const [editingContactIndex, setEditingContactIndex] = useState(-1);
    const [isUploading, setIsUploading] = useState({ contactPic: false });

    useEffect(() => {
        const savedContacts = localStorage.getItem('sc_address_book');
        if (savedContacts) setContacts(JSON.parse(savedContacts));
    }, []);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsUploading({ contactPic: true });
        const formData = new FormData(); 
        formData.append('file', file);
        
        try {
            const response = await fetch(`https://api.fytsolutions.com/api.php?action=upload_file`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                setEditingContact({ ...editingContact, photo: result.url });
            } else {
                alert("Upload failed.");
            }
        } catch (err) { 
            alert("Image server unreachable."); 
        } finally { 
            setIsUploading({ contactPic: false }); 
        }
    };

    const handleExportCSV = () => {
        if (contacts.length === 0) { alert("No contacts to export!"); return; }
        const headers = "Name,Title,Company,Phone,Email,Website,Notes";
        const csvContent = contacts.map(c => {
            const sanitize = (field) => `"${(field || '').toString().replace(/"/g, '""')}"`;
            return [ sanitize(c.name), sanitize(c.title), sanitize(c.company), sanitize(c.phone), sanitize(c.email), sanitize(c.website), sanitize(c.notes) ].join(',');
        }).join('\n');
        const blob = new Blob([`${headers}\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "sc_contacts.csv";
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleDownloadContactVCard = (contact) => {
         const escapeVCardValue = (val) => (val || '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
         let parts = ['BEGIN:VCARD', 'VERSION:3.0'];
         const nameParts = (contact.name || 'Contact').trim().split(/\s+/);
         parts.push(`N:${escapeVCardValue(nameParts.pop() || '')};${escapeVCardValue(nameParts.join(' '))}`);
         parts.push(`FN:${escapeVCardValue(contact.name)}`);
         if (contact.company) parts.push(`ORG:${escapeVCardValue(contact.company)}`);
         if (contact.title) parts.push(`TITLE:${escapeVCardValue(contact.title)}`);
         if (contact.phone) parts.push(`TEL;TYPE=WORK,VOICE:${contact.phone}`);
         if (contact.email) parts.push(`EMAIL:${contact.email}`);
         if (contact.website) parts.push(`URL:https://${contact.website.replace(/^https?:\/\//,'')}`);
         if (contact.notes) parts.push(`NOTE:${escapeVCardValue(contact.notes)}`);
         parts.push('END:VCARD');
         const blob = new Blob([parts.join('\n')], { type: 'text/vcard' });
         const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${(contact.name || 'contact').replace(/\s/g, '_')}.vcf`;
         document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const openNewContactForm = () => { setEditingContact({ name: '', title: '', company: '', phone: '', email: '', website: '', notes: '', photo: '' }); setEditingContactIndex(-1); setContactView('form'); };
    const openEditContactForm = (contact, index) => { setEditingContact({ ...contact }); setEditingContactIndex(index); setContactView('form'); };
    
    const saveAddressBookContact = () => {
        if (!editingContact.name) { alert("Name is required"); return; }
        let newContacts = [...contacts];
        if (editingContactIndex >= 0) newContacts[editingContactIndex] = editingContact; 
        else newContacts.push({ ...editingContact, id: Date.now() });
        setContacts(newContacts); 
        localStorage.setItem('sc_address_book', JSON.stringify(newContacts)); 
        setContactView('list');
    };
    
    const deleteAddressBookContact = (index) => {
        if (window.confirm("Are you sure you want to delete this contact?")) {
            let newContacts = [...contacts]; newContacts.splice(index, 1);
            setContacts(newContacts); 
            localStorage.setItem('sc_address_book', JSON.stringify(newContacts));
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:py-12 sm:px-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 sm:gap-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 md:mb-4 text-white">
                        Address Book
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        Manage and export your saved contacts.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {contactView === 'list' ? (
                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-5 sm:p-8 min-h-[60vh]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                            <h3 className="text-lg font-black uppercase tracking-tighter text-white flex items-center gap-2">
                                <Users size={18} className="text-[#9df01c]"/> Connections
                            </h3>
                            <div className="flex gap-3">
                                <button onClick={handleExportCSV} className="flex-1 sm:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                    <Download size={14}/> Export CSV
                                </button>
                                <button onClick={openNewContactForm} className="flex-1 sm:flex-none px-4 py-2 bg-[#9df01c] text-black hover:bg-[#8ce015] rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                    <Plus size={14}/> Add Contact
                                </button>
                            </div>
                        </div>
                        
                        {contacts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {contacts.map((contact, i) => (
                                    <div key={contact.id || i} className="bg-black p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group flex items-center gap-4">
                                        {contact.photo ? (
                                            <img src={contact.photo} className="w-12 h-12 rounded-full object-cover border border-white/10 bg-[#111] flex-shrink-0" alt="Contact" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg font-bold text-gray-500 flex-shrink-0">
                                                {contact.name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditContactForm(contact, i)}>
                                            <p className="text-sm font-bold text-white truncate group-hover:text-[#9df01c] transition-colors">{contact.name}</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest truncate mt-0.5">{contact.company || contact.title || 'No company listed'}</p>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDownloadContactVCard(contact)} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Download vCard">
                                                <Download size={14}/>
                                            </button>
                                            <button onClick={() => deleteAddressBookContact(i)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Contact">
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-12 border-2 border-dashed border-white/5 rounded-2xl text-gray-500">
                                <Users size={32} className="mx-auto mb-3 opacity-20"/>
                                <p className="text-sm font-medium">Your address book is empty.</p>
                                <p className="text-[10px] mt-1">Contacts you manually add will appear here.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-[#111] rounded-[2rem] border border-white/5 p-5 sm:p-8 relative">
                        <button onClick={() => setContactView('list')} className="absolute top-5 right-5 sm:top-8 sm:right-8 text-gray-500 hover:text-white p-2 bg-white/5 rounded-full transition-colors">
                            <X size={16}/>
                        </button>
                        
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-8 text-white flex items-center gap-2">
                            <ChevronLeft size={18} className="cursor-pointer hover:text-[#9df01c] transition-colors" onClick={() => setContactView('list')}/>
                            {editingContactIndex >= 0 ? 'Edit Contact' : 'New Contact'}
                        </h3>
                        
                        <div className="flex items-center gap-6 mb-8">
                            {editingContact.photo ? (
                                <img src={editingContact.photo} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-white/10 bg-[#0a0a0a]" />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"><Camera size={24} className="text-gray-500" /></div>
                            )}
                            <label className={`px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-2 border border-white/10 ${isUploading.contactPic ? 'opacity-50 pointer-events-none' : ''}`}>
                                {isUploading.contactPic ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}
                                {isUploading.contactPic ? 'Uploading...' : 'Upload Photo'}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Full Name *</label>
                                <input type="text" value={editingContact.name} onChange={e => setEditingContact({...editingContact, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Title</label>
                                <input type="text" value={editingContact.title} onChange={e => setEditingContact({...editingContact, title: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Company</label>
                                <input type="text" value={editingContact.company} onChange={e => setEditingContact({...editingContact, company: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Phone Number</label>
                                <input type="tel" value={editingContact.phone} onChange={e => setEditingContact({...editingContact, phone: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Email Address</label>
                                <input type="email" value={editingContact.email} onChange={e => setEditingContact({...editingContact, email: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Website</label>
                                <input type="text" value={editingContact.website} onChange={e => setEditingContact({...editingContact, website: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Personal Notes</label>
                                <textarea rows="3" value={editingContact.notes} onChange={e => setEditingContact({...editingContact, notes: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#9df01c] outline-none transition-colors"></textarea>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5 flex justify-end">
                            <button onClick={saveAddressBookContact} className="flex items-center justify-center w-full sm:w-auto gap-2 bg-[#9df01c] text-black hover:bg-[#8ce015] font-black py-3 px-8 rounded-xl text-[11px] uppercase tracking-widest transition-all">
                                <Save className="w-4 h-4"/> Save Contact
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}