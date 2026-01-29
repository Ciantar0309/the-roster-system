// frontend/src/components/StaffingConfigPanel.tsx
import { useMemo } from 'react';
import type { StaffingConfig, DayStaffingConfig } from '../types';
import { DEFAULT_STAFFING_CONFIG } from '../types';

interface StaffingConfigPanelProps {
  config: StaffingConfig | null | undefined;
  onChange: (config: StaffingConfig) => void;
  openTime?: string;
  closeTime?: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export default function StaffingConfigPanel({ 
  config, 
  onChange,
}: StaffingConfigPanelProps) {
  
  const safeConfig: StaffingConfig = useMemo(() => {
    const base = DEFAULT_STAFFING_CONFIG;
    if (!config) return base;
    
    return {
      coverageMode: config.coverageMode || base.coverageMode,
      fullDayCountsAsBoth: config.fullDayCountsAsBoth ?? base.fullDayCountsAsBoth,
      neverBelowMinimum: config.neverBelowMinimum ?? base.neverBelowMinimum,
      weeklySchedule: config.weeklySchedule?.length === 7 
        ? config.weeklySchedule.map((day, i) => ({
            ...base.weeklySchedule[i],
            ...day,
            targetAM: day.targetAM ?? day.minAM ?? base.weeklySchedule[i].targetAM,
            targetPM: day.targetPM ?? day.minPM ?? base.weeklySchedule[i].targetPM,
          }))
        : base.weeklySchedule
    };
  }, [config]);

  const updateDay = (dayIndex: number, field: keyof DayStaffingConfig, value: number | boolean | string) => {
    const newSchedule = [...safeConfig.weeklySchedule];
    newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
    onChange({ ...safeConfig, weeklySchedule: newSchedule });
  };

  const updateRule = (field: keyof StaffingConfig, value: boolean | string) => {
    onChange({ ...safeConfig, [field]: value });
  };

  const applyPreset = (preset: 'solo' | 'small' | 'busy' | 'weekend') => {
    let newSchedule: DayStaffingConfig[];
    
    switch (preset) {
      case 'solo':
        newSchedule = safeConfig.weeklySchedule.map(day => ({
          ...day,
          minAM: 1, minPM: 1, targetAM: 1, targetPM: 1, minFullDay: 0, maxStaff: 2
        }));
        break;
      case 'small':
        newSchedule = safeConfig.weeklySchedule.map(day => ({
          ...day,
          minAM: 1, minPM: 1, targetAM: 2, targetPM: 2, minFullDay: 0, maxStaff: 4
        }));
        break;
      case 'busy':
        newSchedule = safeConfig.weeklySchedule.map(day => ({
          ...day,
          minAM: 2, minPM: 2, targetAM: 4, targetPM: 2, minFullDay: 0, maxStaff: 8
        }));
        break;
      case 'weekend':
        newSchedule = safeConfig.weeklySchedule.map((day, i) => ({
          ...day,
          minAM: i >= 5 ? 2 : 1,
          minPM: i >= 5 ? 2 : 1,
          targetAM: i >= 5 ? 4 : 2,
          targetPM: i >= 5 ? 3 : 2,
          minFullDay: 0,
          maxStaff: i >= 5 ? 8 : 4
        }));
        break;
      default:
        return;
    }
    
    onChange({ ...safeConfig, weeklySchedule: newSchedule });
  };

  return (
    <div className="space-y-4">
      {/* Info Box */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <p className="font-medium text-blue-800 mb-1">How it works:</p>
        <ul className="text-blue-700 text-xs space-y-1">
          <li>• <strong>Target</strong> = Ideal staffing (solver tries to reach this)</li>
          <li>• <strong>Min</strong> = Absolute minimum (solver will NEVER go below this)</li>
          <li>• Example: Target 4 AM, Min 2 AM → Solver aims for 4, but accepts 2-3 if hours are tight</li>
        </ul>
      </div>

      {/* Coverage Mode */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
        <span className="text-xs font-medium text-gray-600 w-16">Mode:</span>
        <div className="flex gap-1 flex-1">
          {(['flexible', 'split', 'fullDayOnly'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => updateRule('coverageMode', mode)}
              className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                safeConfig.coverageMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {mode === 'flexible' ? 'Flexible' : mode === 'split' ? 'AM/PM Only' : 'Full Day'}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-500 w-16">Presets:</span>
        <button type="button" onClick={() => applyPreset('solo')} className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Solo (1/1)</button>
        <button type="button" onClick={() => applyPreset('small')} className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Small (2/2)</button>
        <button type="button" onClick={() => applyPreset('busy')} className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Busy (4/2)</button>
        <button type="button" onClick={() => applyPreset('weekend')} className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Wknd Heavy</button>
      </div>

      {/* Schedule Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 font-medium text-gray-600 w-12">Day</th>
              <th className="text-center py-2 px-1 font-medium text-blue-600 bg-blue-50" colSpan={2}>
                AM Staff
              </th>
              <th className="text-center py-2 px-1 font-medium text-purple-600 bg-purple-50" colSpan={2}>
                PM Staff
              </th>
              <th className="text-center py-2 px-1 font-medium text-gray-600 w-14">Full Day</th>
              <th className="text-center py-2 px-1 font-medium text-gray-600 w-14">Max</th>
              <th className="text-center py-2 px-1 font-medium text-gray-600 w-12">Req'd</th>
            </tr>
            <tr className="border-b border-gray-300 bg-gray-50">
              <th></th>
              <th className="text-center py-1 px-1 text-[10px] font-normal text-blue-500 bg-blue-50">Target</th>
              <th className="text-center py-1 px-1 text-[10px] font-normal text-orange-600 bg-orange-50">Min</th>
              <th className="text-center py-1 px-1 text-[10px] font-normal text-purple-500 bg-purple-50">Target</th>
              <th className="text-center py-1 px-1 text-[10px] font-normal text-orange-600 bg-orange-50">Min</th>
              <th></th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, i) => {
              const schedule = safeConfig.weeklySchedule[i];
              const isWeekend = i >= 5;
              
              return (
                <tr key={day} className={`border-b border-gray-100 ${isWeekend ? 'bg-amber-50/30' : ''}`}>
                  <td className="py-1.5 px-2 font-medium text-gray-700">
                    {day}
                    {isWeekend && <span className="ml-1 text-[9px] text-amber-600">★</span>}
                  </td>
                  
                  {/* AM Target */}
                  <td className="py-1 px-0.5 text-center bg-blue-50/30">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={schedule.targetAM}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        updateDay(i, 'targetAM', val);
                        // Auto-adjust min if target goes below
                        if (val < schedule.minAM) {
                          updateDay(i, 'minAM', val);
                        }
                      }}
                      className="w-11 px-1 py-1 border border-blue-300 rounded text-center text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                      title="Target AM staff (ideal)"
                    />
                  </td>
                  
                  {/* AM Min */}
                  <td className="py-1 px-0.5 text-center bg-orange-50/50">
                    <input
                      type="number"
                      min={0}
                      max={schedule.targetAM}
                      value={schedule.minAM}
                      onChange={(e) => updateDay(i, 'minAM', parseInt(e.target.value) || 0)}
                      className="w-10 px-1 py-1 border-2 border-orange-400 rounded text-center text-xs text-orange-700 font-semibold focus:ring-1 focus:ring-orange-500 bg-orange-50"
                      title="Minimum AM staff (HARD LIMIT)"
                    />
                  </td>
                  
                  {/* PM Target */}
                  <td className="py-1 px-0.5 text-center bg-purple-50/30">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={schedule.targetPM}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        updateDay(i, 'targetPM', val);
                        if (val < schedule.minPM) {
                          updateDay(i, 'minPM', val);
                        }
                      }}
                      className="w-11 px-1 py-1 border border-purple-300 rounded text-center text-xs focus:ring-1 focus:ring-purple-500 bg-white"
                      title="Target PM staff (ideal)"
                    />
                  </td>
                  
                  {/* PM Min */}
                  <td className="py-1 px-0.5 text-center bg-orange-50/50">
                    <input
                      type="number"
                      min={0}
                      max={schedule.targetPM}
                      value={schedule.minPM}
                      onChange={(e) => updateDay(i, 'minPM', parseInt(e.target.value) || 0)}
                      className="w-10 px-1 py-1 border-2 border-orange-400 rounded text-center text-xs text-orange-700 font-semibold focus:ring-1 focus:ring-orange-500 bg-orange-50"
                      title="Minimum PM staff (HARD LIMIT)"
                    />
                  </td>
                  
                  {/* Full Day */}
                  <td className="py-1 px-0.5 text-center">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={schedule.minFullDay}
                      onChange={(e) => updateDay(i, 'minFullDay', parseInt(e.target.value) || 0)}
                      className="w-11 px-1 py-1 border border-gray-300 rounded text-center text-xs focus:ring-1 focus:ring-blue-500"
                      title="Minimum full-day shifts required"
                    />
                  </td>
                  
                  {/* Max Staff */}
                  <td className="py-1 px-0.5 text-center">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={schedule.maxStaff}
                      onChange={(e) => updateDay(i, 'maxStaff', parseInt(e.target.value) || 1)}
                      className="w-11 px-1 py-1 border border-gray-300 rounded text-center text-xs focus:ring-1 focus:ring-blue-500"
                      title="Maximum total staff for this day"
                    />
                  </td>
                  
                  {/* Mandatory */}
                  <td className="py-1 px-0.5 text-center">
                    <input
                      type="checkbox"
                      checked={schedule.isMandatory}
                      onChange={(e) => updateDay(i, 'isMandatory', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      title="Mandatory day (must be staffed)"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-600 p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 border border-blue-300 rounded bg-white"></div>
          <span>Target (try to reach)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 border-2 border-orange-400 rounded bg-orange-50"></div>
          <span className="font-medium text-orange-700">Min (NEVER below)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-amber-600">★</span>
          <span>Weekend</span>
        </div>
      </div>

      {/* Rules */}
      <div className="flex items-center gap-6 p-3 bg-gray-50 rounded-lg text-xs">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={safeConfig.fullDayCountsAsBoth}
            onChange={(e) => updateRule('fullDayCountsAsBoth', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-gray-700">Full day shift counts as AM + PM coverage</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={safeConfig.neverBelowMinimum}
            onChange={(e) => updateRule('neverBelowMinimum', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-gray-700 font-medium">Enforce minimums (hard constraint)</span>
        </label>
      </div>

      {/* Summary */}
      <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Weekly Summary</h4>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-blue-600">
              {safeConfig.weeklySchedule.reduce((sum, d) => sum + d.targetAM, 0)}
            </p>
            <p className="text-[10px] text-gray-500">Target AM</p>
          </div>
          <div>
            <p className="text-lg font-bold text-purple-600">
              {safeConfig.weeklySchedule.reduce((sum, d) => sum + d.targetPM, 0)}
            </p>
            <p className="text-[10px] text-gray-500">Target PM</p>
          </div>
          <div>
            <p className="text-lg font-bold text-orange-600">
              {safeConfig.weeklySchedule.reduce((sum, d) => sum + d.minAM, 0)}
            </p>
            <p className="text-[10px] text-gray-500">Min AM</p>
          </div>
          <div>
            <p className="text-lg font-bold text-orange-600">
              {safeConfig.weeklySchedule.reduce((sum, d) => sum + d.minPM, 0)}
            </p>
            <p className="text-[10px] text-gray-500">Min PM</p>
          </div>
        </div>
      </div>
    </div>
  );
}
