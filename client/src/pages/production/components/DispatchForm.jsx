import { Plus, Trash2, Save, X } from 'lucide-react';
import { useState } from 'react';

const DispatchForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    dispatchNo: 'DISP-' + Math.floor(1000 + Math.random() * 9000),
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [currentItem, setCurrentItem] = useState({ product: '', unit: 'KG', quantity: '' });
  const [lineItems, setLineItems] = useState([]);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (e) => {
    setCurrentItem({ ...currentItem, [e.target.name]: e.target.value });
  };

  const addLineItem = () => {
    if (currentItem.product && currentItem.quantity) {
      setLineItems([...lineItems, { id: Date.now(), ...currentItem }]);
      setCurrentItem({ product: '', unit: 'KG', quantity: '' });
    }
  };

  const removeLineItem = (id) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleSave = () => {
    if (lineItems.length === 0) {
        alert("Please add at least one line item to the dispatch grid.");
        return;
    }
    onSave({ ...formData, items: lineItems });
  };

  return (
    <div className="rounded-sm border border-slate-200 bg-white shadow-sm flex flex-col mb-4">
      <div className="border-b border-slate-200 px-4 py-3 bg-slate-50">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          New Dispatch Entry
        </h2>
      </div>

      <div className="p-4 bg-white border-b border-slate-100">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dispatch No</label>
            <input
              type="text"
              name="dispatchNo"
              value={formData.dispatchNo}
              onChange={handleFormChange}
              className="block w-full rounded-sm border border-slate-300 py-1.5 px-2 text-xs text-slate-900 focus:border-sap-primary focus:outline-none focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleFormChange}
              className="block w-full rounded-sm border border-slate-300 py-1.5 px-2 text-xs text-slate-900 focus:border-sap-primary focus:outline-none focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Notes</label>
            <input
              type="text"
              name="notes"
              value={formData.notes}
              onChange={handleFormChange}
              placeholder="Optional reference"
              className="block w-full rounded-sm border border-slate-300 py-1.5 px-2 text-xs text-slate-900 focus:border-sap-primary focus:outline-none focus:ring-1 focus:ring-sap-primary"
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-50/50">
        <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-3">Line Items Entry</h3>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Product</label>
            <select
              name="product"
              value={currentItem.product}
              onChange={handleItemChange}
              className="block w-full rounded-sm border border-slate-300 py-1.5 px-2 text-xs text-slate-900 focus:border-sap-primary focus:outline-none focus:ring-1 focus:ring-sap-primary"
            >
              <option value="">Select Item...</option>
              <option value="Raw Milk (Cow)">Raw Milk (Cow)</option>
              <option value="Raw Milk (Buffalo)">Raw Milk (Buffalo)</option>
              <option value="Packaging Film 500ml">Packaging Film 500ml</option>
              <option value="Raw Sugar">Raw Sugar</option>
              <option value="Flavor Essence (Vanilla)">Flavor Essence (Vanilla)</option>
            </select>
          </div>
          <div className="w-24 shrink-0">
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unit</label>
             <select
              name="unit"
              value={currentItem.unit}
              onChange={handleItemChange}
              className="block w-full rounded-sm border border-slate-300 py-1.5 px-2 text-xs text-slate-900 focus:border-sap-primary focus:outline-none focus:ring-1 focus:ring-sap-primary"
            >
              <option value="KG">KG</option>
              <option value="L">L</option>
              <option value="Roll">Roll</option>
              <option value="Nos">Nos</option>
            </select>
          </div>
          <div className="w-32 shrink-0">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quantity</label>
            <input
              type="number"
              name="quantity"
              value={currentItem.quantity}
              onChange={handleItemChange}
              placeholder="0.00"
              className="block w-full rounded-sm border border-slate-300 py-1.5 px-2 text-xs text-slate-900 focus:border-sap-primary focus:outline-none focus:ring-1 focus:ring-sap-primary"
            />
          </div>
          <button
            type="button"
            onClick={addLineItem}
            className="inline-flex items-center gap-1 bg-sap-primary text-white text-[11px] font-bold px-3 py-1.5 rounded-sm hover:bg-blue-700 transition-colors h-[30px]"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {/* Line Items Grid */}
        {lineItems.length > 0 && (
          <div className="border border-slate-200 rounded-sm overflow-hidden mb-4 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600 uppercase">Product Details</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 uppercase">Unit</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-600 uppercase">Issue Qty</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-1.5 text-xs text-slate-800 font-medium">{item.product}</td>
                    <td className="px-3 py-1.5 text-xs text-slate-600 text-center">{item.unit}</td>
                    <td className="px-3 py-1.5 text-xs font-bold text-sap-dark text-right">{item.quantity}</td>
                    <td className="px-3 py-1.5 text-center">
                      <button onClick={() => removeLineItem(item.id)} className="text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 className="h-4 w-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold px-4 py-1.5 rounded-sm hover:bg-slate-50 transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" /> Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 bg-sap-primary text-white text-xs font-bold px-5 py-1.5 rounded-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Save className="h-4 w-4" /> Save Dispatch
          </button>
        </div>
      </div>
    </div>
  );
};

export default DispatchForm;
