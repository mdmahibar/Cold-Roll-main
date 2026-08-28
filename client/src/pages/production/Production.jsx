import { useState } from 'react';
import { useDivision } from '../../context/DivisionContext';
import { MapPin, Plus } from 'lucide-react';

import StoreDispatch from './tabs/StoreDispatch';
import ProductionReceive from './tabs/ProductionReceive';
import ProductionIssue from './tabs/ProductionIssue';
import ProductionReceipt from './tabs/ProductionReceipt';
import Mixing from './tabs/Mixing';
import FinishedProduct from './tabs/FinishedProduct';
import Byproduct from './tabs/Byproduct';
import ByProductReceive from './tabs/ByProductReceive';
import Reprocess from './tabs/Reprocess';
import OtherReprocess from './tabs/OtherReprocess';
import MaterialIssue from './tabs/MaterialIssue';
import RMDamage from './tabs/RMDamage';
import FinishDamage from './tabs/FinishDamage';
import MixingDamage from './tabs/MixingDamage';
import StockTransfer from './tabs/StockTransfer';
import PlantClosing from './tabs/PlantClosing';
import MilkConversion from './tabs/MilkConversion';
import MilkHighFatConversion from './tabs/MilkHighFatConversion';
import MilkStockTransfer from './tabs/MilkStockTransfer';
import MilkStockReceive from './tabs/MilkStockReceive';
import ClosingStock from './tabs/ClosingStock';

const tabs = [
  { id: 'dispatch', name: 'Store Dispatch', icon: '📦', component: StoreDispatch },
  { id: 'receive', name: 'Production Receive', icon: '📥', component: ProductionReceive },
  { id: 'issue', name: 'Production Issue', icon: '📋', component: ProductionIssue },
  { id: 'receipt', name: 'Production Receipt', icon: '🏷️', component: ProductionReceipt },
  { id: 'mixing', name: 'Mixing', icon: '🔄', component: Mixing },
  { id: 'finished', name: 'Finished Product', icon: '✅', component: FinishedProduct },
  // { id: 'byproduct', name: 'By-product', icon: '♻️', component: Byproduct },
  // { id: 'byproduct_receive', name: 'By-product Receive', icon: '📥', component: ByProductReceive },
  // { id: 'reprocess', name: 'Reprocess', icon: '🔁', component: Reprocess },
  // { id: 'other_reprocess', name: 'Other Reprocess', icon: '⚙️', component: OtherReprocess },
  // { id: 'material_issue', name: 'Material Issue', icon: '📝', component: MaterialIssue },
  // { id: 'damage', name: 'RM Damage', icon: '⚠️', component: RMDamage },
  { id: 'finish_damage', name: 'Finish Damage', icon: '🚫', component: FinishDamage },
  // { id: 'mixing_damage', name: 'Mixing Damage', icon: '💔', component: MixingDamage },
  // { id: 'transfer', name: 'Stock Transfer', icon: '🔀', component: StockTransfer },
  // { id: 'plant_closing', name: 'Plant Closing', icon: '🏭', component: PlantClosing },
  { id: 'milk_conversion', name: 'Milk Conversion', icon: '🥛', component: MilkConversion },
  // { id: 'high_fat', name: 'High FAT Conv', icon: '🧈', component: MilkHighFatConversion },
  { id: 'milk_transfer', name: 'Milk Transfer', icon: '🚛', component: MilkStockTransfer },
  // { id: 'milk_receive', name: 'Milk Receive', icon: '📦', component: MilkStockReceive },
  { id: 'closing', name: 'Closing Stock', icon: '📊', component: ClosingStock },
];

const flowSteps = [
  { label: 'Transfer Req.', sub: 'Approved', done: true },
  { label: 'Inv. Transfer', sub: 'Done', done: true },
  { label: 'Prod. Issue', sub: 'Active', count: 3, active: true },
  { label: 'Prod. Receipt', sub: 'After Issue', count: 4 },
];

const Production = () => {
  const { selectedDivision } = useDivision();
  const [activeTab, setActiveTab] = useState('dispatch');

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || ProductionIssue;

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">

      {/* ═══ Breadcrumb + Title + Action Buttons ═══ */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span className="text-sap-primary cursor-pointer hover:underline">Home</span>
          <span>›</span>
          <span className="text-gray-600 font-medium">Production</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
              🏭 Production Management
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
              Production Issue & Receipt — managed on single page · Division mandatory
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* 
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold cursor-pointer transition-colors ${selectedDivision === 'Ice Cream'
              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
              : 'bg-blue-50 border-blue-200 text-sap-primary hover:bg-blue-100'
              }`}>
              {selectedDivision === 'Ice Cream' ? '🍦' : '🥛'} {selectedDivision} Division
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-[11px] font-semibold text-red-600 cursor-pointer hover:bg-red-100 transition-colors">
              <MapPin className="h-3 w-3" /> Rampurhat *
            </span>
            */}
            {/* <button className="btn-primary">+ New Issue</button> */}
          </div>
        </div>
      </div>

      {/* ═══ Flow Steps ═══ */}
      {/* 
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden mb-4">
        <div className="flex items-stretch">
          {flowSteps.map((step, idx) => (
            <div
              key={idx}
              className={`flex-1 flex flex-col items-center justify-center py-4 text-center border-r border-gray-100 last:border-r-0 transition-colors ${step.active
                ? 'bg-green-50'
                : ''
                }`}
            >
              <div className={`flex items-center justify-center text-sm font-bold ${step.done
                ? 'text-green-600'
                : step.active
                  ? 'text-green-700'
                  : 'text-gray-500'
                }`}>
                {step.done ? (
                  <span className="text-lg">✓</span>
                ) : (
                  <span className={`text-xl font-extrabold ${step.active ? 'text-green-700' : 'text-gray-500'}`}>
                    {step.count}
                  </span>
                )}
              </div>
              <p className={`mt-1 text-[11.5px] font-semibold ${step.active ? 'text-green-700' : step.done ? 'text-gray-700' : 'text-gray-500'
                }`}>
                {step.label}
              </p>
              <p className={`text-[10px] ${step.active ? 'text-green-600 font-semibold' : step.done ? 'text-green-600 font-medium' : 'text-gray-400'
                }`}>
                {step.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
      */}

      {/* ═══ Tabs (Blue active style) + Content ═══ */}
      <div className="flex flex-col gap-0">
        {/* Tab Bar */}
        <div className="flex border border-gray-200 rounded-t-lg overflow-hidden bg-white">
          <div className="flex overflow-x-auto w-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-[11.5px] font-semibold transition-all border-b-2 ${isActive
                    ? 'bg-sap-primary text-white border-sap-primary'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border-transparent'
                    }`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="border border-t-0 border-gray-200 rounded-b-lg bg-sap-light/50 p-4">
          <ActiveComponent />
        </div>
      </div>

    </div>
  );
};

export default Production;
