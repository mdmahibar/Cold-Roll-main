import { useState } from 'react';
import { useDivision } from '../context/DivisionContext';
import {
  Plus,
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  Save,
  ArrowRight,
  X,
  PlusCircle
} from 'lucide-react';

const Production = () => {
  const { selectedDivision } = useDivision();
  const [activeTab, setActiveTab] = useState('Production Issue');
  const [currentStep, setCurrentStep] = useState(2); // 0-indexed: 2 is 'Production Issue'

  const steps = [
    'Transfer Req',
    'Inventory Transfer',
    'Production Issue',
    'Production Receipt',
  ];

  const tabs = ['Production Issue', 'Production Receipt', 'Production List'];

  const [issueForm, setIssueForm] = useState({
    location: '',
    productionOrder: '',
    issueDate: new Date().toISOString().split('T')[0],
    product: '',
    plannedQty: '',
    batchNumber: '',
  });

  const [rawMaterials, setRawMaterials] = useState([
    {
      id: 1,
      itemCode: 'RMP-001',
      description: 'Raw Milk',
      warehouse: 'Main WH',
      requiredQty: '500',
      issueQty: '500',
      unit: 'KG',
      batch: 'B-1001',
    },
    {
      id: 2,
      itemCode: 'PKG-005',
      description: 'Standard Pouch 500ml',
      warehouse: 'Packaging WH',
      requiredQty: '1000',
      issueQty: '1000',
      unit: 'Nos',
      batch: 'B-1001',
    },
  ]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setIssueForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMaterialChange = (id, field, value) => {
    setRawMaterials((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addLine = () => {
    setRawMaterials((prev) => [
      ...prev,
      {
        id: Date.now(),
        itemCode: '',
        description: '',
        warehouse: '',
        requiredQty: '',
        issueQty: '',
        unit: '',
        batch: '',
      },
    ]);
  };

  const handlePostIssue = () => {
    // Navigate to Receipt tab and Update Step
    setActiveTab('Production Receipt');
    setCurrentStep(3);
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Production Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage production orders, material issues, and finished goods receipts.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              selectedDivision === 'Milk'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {selectedDivision} Division
          </span>
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500">
            <Plus className="h-4 w-4" />
            New Issue
          </button>
        </div>
      </div>

      {/* Step Flow Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hidden md:block">
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <li
                  key={step}
                  className={`relative ${
                    index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''
                  }`}
                >
                  <div className="flex items-center cursor-default">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isCompleted
                          ? 'bg-blue-600 hover:bg-blue-800'
                          : isCurrent
                          ? 'border-2 border-blue-600 bg-white'
                          : 'border-2 border-slate-300 bg-white'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      ) : isCurrent ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                      ) : (
                        <Circle className="h-3 w-3 text-slate-300" />
                      )}
                    </div>
                    <span
                      className={`ml-4 text-sm font-medium ${
                        isCompleted || isCurrent
                          ? 'text-slate-900 font-semibold'
                          : 'text-slate-500'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                  {index !== steps.length - 1 && (
                    <div className="absolute top-4 left-0 -ml-px mt-0.5 h-0.5 w-full bg-slate-200" aria-hidden="true" />
                  )}
                  {index !== steps.length - 1 && isCompleted && (
                    <div className="absolute top-4 left-0 -ml-px mt-0.5 h-0.5 w-full bg-blue-600 z-0" style={{ width: 'calc(100% - 2rem)' }} aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Tabs Section */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area based on Tabs */}
      {activeTab === 'Production Issue' && (
        <div className="flex flex-col gap-6">
          {/* Production Issue Form */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h2 className="text-base font-semibold leading-6 text-slate-900">
                Production Issue Details
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Division
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={selectedDivision}
                    className="block w-full rounded-md border border-slate-300 bg-slate-50 py-2 px-3 text-sm text-slate-500 shadow-sm focus:outline-none cursor-not-allowed"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Location / Factory
                  </label>
                  <select
                    name="location"
                    value={issueForm.location}
                    onChange={handleFormChange}
                    className="block w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select Location</option>
                    <option value="Main Plant">Main Plant</option>
                    <option value="Secondary Unit">Secondary Unit</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Production Order
                  </label>
                  <input
                    type="text"
                    name="productionOrder"
                    value={issueForm.productionOrder}
                    onChange={handleFormChange}
                    placeholder="PO-2026-04"
                    className="block w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    name="issueDate"
                    value={issueForm.issueDate}
                    onChange={handleFormChange}
                    className="block w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Finished Product
                  </label>
                  <select
                    name="product"
                    value={issueForm.product}
                    onChange={handleFormChange}
                    className="block w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select Product</option>
                    <option value="Pasteurized Milk 500ml">Pasteurized Milk 500ml</option>
                    <option value="Vanilla Ice Cream 1L">Vanilla Ice Cream 1L</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Planned Qty
                  </label>
                  <input
                    type="number"
                    name="plannedQty"
                    value={issueForm.plannedQty}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    className="block w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    name="batchNumber"
                    value={issueForm.batchNumber}
                    onChange={handleFormChange}
                    placeholder="Auto Generated"
                    className="block w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Raw Materials Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-semibold leading-6 text-slate-900">
                Raw Materials Consumed
              </h2>
            </div>
            
            <div className="overflow-x-auto w-full">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-white">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Code</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Description</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Warehouse</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Required Qty</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Qty</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Batch</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {rawMaterials.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={row.itemCode}
                          onChange={(e) => handleMaterialChange(row.id, 'itemCode', e.target.value)}
                          className="w-full rounded border-slate-300 py-1.5 px-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Code"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => handleMaterialChange(row.id, 'description', e.target.value)}
                          className="w-full rounded border-slate-300 py-1.5 px-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Description"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={row.warehouse}
                          onChange={(e) => handleMaterialChange(row.id, 'warehouse', e.target.value)}
                          className="w-full rounded border-slate-300 py-1.5 px-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="WH"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          value={row.requiredQty}
                          readOnly
                          className="w-full rounded border-transparent bg-transparent py-1.5 px-2 text-sm text-slate-500 cursor-not-allowed"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          value={row.issueQty}
                          onChange={(e) => handleMaterialChange(row.id, 'issueQty', e.target.value)}
                          className="w-full rounded border-slate-300 py-1.5 px-2 text-sm text-blue-700 font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) => handleMaterialChange(row.id, 'unit', e.target.value)}
                          className="w-16 rounded border-slate-300 py-1.5 px-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="KG"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={row.batch}
                          onChange={(e) => handleMaterialChange(row.id, 'batch', e.target.value)}
                          className="w-24 rounded border-slate-300 py-1.5 px-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="B-XXX"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 py-4 border-t border-slate-200">
                <button
                  onClick={addLine}
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <PlusCircle className="h-4 w-4" /> Add Line
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-2 mb-6">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-colors"
            >
              <X className="h-4 w-4 text-slate-400" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePostIssue}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
            >
              Post Issue & Go to Receipt
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Production Receipt' && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center bg-slate-50 mt-4">
          <AlertCircle className="h-10 w-10 text-blue-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">Production Receipt</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Please post a Production Issue first to receive finished goods into inventory.
          </p>
        </div>
      )}

      {activeTab === 'Production List' && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center flex flex-col items-center justify-center mt-4">
          <h3 className="text-lg font-semibold text-slate-900">Production Orders History</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Historical views of issues and receipts will appear here.
          </p>
        </div>
      )}

    </div>
  );
};

export default Production;
