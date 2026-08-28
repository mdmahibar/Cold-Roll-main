import { Edit, Eye } from 'lucide-react';

const DispatchTable = ({ dispatchList }) => {
  return (
    <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col mt-4">
      <div className="border-b border-slate-200 px-4 py-3 bg-slate-50">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Dispatch History
        </h2>
      </div>
      
      <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th scope="col" className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dispatch No</th>
              <th scope="col" className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</th>
              <th scope="col" className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">User</th>
              <th scope="col" className="px-4 py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {dispatchList.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="whitespace-nowrap px-4 py-2 text-xs font-medium text-sap-dark">{item.dispatchNo}</td>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-600">{item.date}</td>
                <td className="px-4 py-2 text-xs text-slate-600 truncate max-w-[200px]">{item.notes}</td>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-600">{item.user}</td>
                <td className="whitespace-nowrap px-4 py-2 flex justify-center gap-3">
                  <button className="text-slate-400 hover:text-sap-primary transition-colors" title="View">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="text-slate-400 hover:text-sap-primary transition-colors" title="Edit">
                    <Edit className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {dispatchList.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-xs text-slate-500">
                  No dispatch records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DispatchTable;
