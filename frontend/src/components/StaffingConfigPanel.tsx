// frontend/src/components/StaffingConfigPanel.tsx
import React, { useMemo } from 'react';
import type { StaffingConfig } from '../types';
import { DEFAULT_STAFFING_CONFIG } from '../types';

interface StaffingConfigPanelProps {
  config: StaffingConfig;
  onChange: (config: StaffingConfig) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const StaffingConfigPanel: React.FC<StaffingConfigPanelProps> = ({
  config,
  onChange,
}) => {
  const safeConfig: StaffingConfig = {
    ...DEFAULT_STAFFING_CONFIG,
    ...config,
    rules: {
      ...DEFAULT_STAFFING_CONFIG.rules,
      ...(config.rules || {})
    },
    weeklySchedule: config.weeklySchedule?.length === 7 
      ? config.weeklySchedule 
      : DEFAULT_STAFFING_CONFIG.weeklySchedule
  };

  const updateCoverageMode = (mode: 'split' | 'flexible' | 'fullDayOnly') => {
    onChange({ ...safeConfig, coverageMode: mode });
  };

  const updateDayConfig = (dayIndex: number, field: string, value: number | boolean) => {
    const newSchedule = [...safeConfig.weeklySchedule];
    newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
    onChange({ ...safeConfig, weeklySchedule: newSchedule });
  };

  const updateRule = (rule: 'fullDayCountsAsBoth' | 'neverBelowMinimum', value: boolean) => {
    onChange({
      ...safeConfig,
      rules: { ...safeConfig.rules, [rule]: value }
    });
  };

  const applyToAllDays = (field: 'minAM' | 'minPM' | 'minFullDay' | 'maxStaff', value: number) => {
    const newSchedule = safeConfig.weeklySchedule.map(day => ({
      ...day,
      [field]: value
    }));
    onChange({ ...safeConfig, weeklySchedule: newSchedule });
  };

  const totals = useMemo(() => {
    let am = 0, pm = 0, full = 0;
    safeConfig.weeklySchedule.forEach(day => {
      am += day.minAM || 0;
      pm += day.minPM || 0;
      full += day.minFullDay || 0;
    });
    return { am, pm, full };
  }, [safeConfig.weeklySchedule]);

  return (
    <div className="space-y-4">
      {/* Coverage Mode - Compact */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 w-24">Mode:</span>
        <div className="flex gap-1 flex-1">
          {[
            { id: 'split', label: 'Split (AM+PM)' },
            { id: 'flexible', label: 'Flexible' },
            { id: 'fullDayOnly', label: 'Full Day Only' }
          ].map(mode => (
            <button
              key={mode.id}
              type="button"
              onClick={() => updateCoverageMode(mode.id as 'split' | 'flexible' | 'fullDayOnly')}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                safeConfig.coverageMode === mode.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Schedule - Compact Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">Weekly Schedule</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => applyToAllDays('minAM', 2)}
              className="text-xs px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 rounded"
            >
              AM=2
            </button>
            <button
              type="button"
              onClick={() => applyToAllDays('minPM', 2)}
              className="text-xs px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 rounded"
            >
              PM=2
            </button>
            <button
              type="button"
              onClick={() => applyToAllDays('maxStaff', 4)}
              className="text-xs px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 rounded"
            >
              Max=4
            </button>
          </div>
        </div>
        
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="px-2 py-2 text-left w-12">Day</th>
              <th className="px-2 py-2 text-center w-16">AM</th>
              <th className="px-2 py-2 text-center w-16">PM</th>
              <th className="px-2 py-2 text-center w-16">Full</th>
              <th className="px-2 py-2 text-center w-16">Max</th>
              <th className="px-2 py-2 text-center w-12">Req</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {DAYS.map((day, index) => (
              <tr key={day} className="hover:bg-gray-50">
                <td className="px-2 py-1.5 font-medium text-gray-700">{day}</td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={safeConfig.weeklySchedule[index]?.minAM || 0}
                    onChange={e => updateDayConfig(index, 'minAM', parseInt(e.target.value) || 0)}
                    disabled={safeConfig.coverageMode === 'fullDayOnly'}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-center text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={safeConfig.weeklySchedule[index]?.minPM || 0}
                    onChange={e => updateDayConfig(index, 'minPM', parseInt(e.target.value) || 0)}
                    disabled={safeConfig.coverageMode === 'fullDayOnly'}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-center text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={safeConfig.weeklySchedule[index]?.minFullDay || 0}
                    onChange={e => updateDayConfig(index, 'minFullDay', parseInt(e.target.value) || 0)}
                    disabled={safeConfig.coverageMode === 'split'}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-center text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={safeConfig.weeklySchedule[index]?.maxStaff || 3}
                    onChange={e => updateDayConfig(index, 'maxStaff', parseInt(e.target.value) || 3)}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-center text-sm"
                  />
                </td>
                <td className="px-1 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={safeConfig.weeklySchedule[index]?.isMandatory || false}
                    onChange={e => updateDayConfig(index, 'isMandatory', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Totals Row */}
        <div className="bg-blue-50 px-3 py-2 text-xs text-blue-700 flex justify-between border-t border-blue-100">
          <span>Weekly Minimums:</span>
          <span className="font-medium">AM: {totals.am} | PM: {totals.pm} | Full: {totals.full}</span>
        </div>
      </div>

      {/* Rules - Compact Inline */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 flex-1 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
          <input
            type="checkbox"
            checked={safeConfig.rules.fullDayCountsAsBoth}
            onChange={e => updateRule('fullDayCountsAsBoth', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700">Full day = AM + PM</span>
        </label>
        <label className="flex items-center gap-2 flex-1 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
          <input
            type="checkbox"
            checked={safeConfig.rules.neverBelowMinimum}
            onChange={e => updateRule('neverBelowMinimum', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700">Enforce minimums (hard)</span>
        </label>
      </div>
    </div>
  );
};

export default StaffingConfigPanel;
