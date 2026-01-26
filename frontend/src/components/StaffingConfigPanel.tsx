// frontend/src/components/StaffingConfigPanel.tsx
import React, { useMemo } from 'react';
import { ToggleLeft, ToggleRight, Info } from 'lucide-react';
import type { StaffingConfig } from '../types';
import { DEFAULT_STAFFING_CONFIG } from '../types';

interface StaffingConfigPanelProps {
  config: StaffingConfig;
  onChange: (config: StaffingConfig) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const StaffingConfigPanel: React.FC<StaffingConfigPanelProps> = ({
  config,
  onChange,
}) => {
  // Ensure config has all required fields
  const safeConfig: StaffingConfig = {
    ...DEFAULT_STAFFING_CONFIG,
    ...config,
    minimumStaff: {
      ...DEFAULT_STAFFING_CONFIG.minimumStaff,
      ...(config.minimumStaff || {})
    },
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

  const updateMinimumStaff = (field: 'atOpening' | 'atClosing', value: number) => {
    onChange({
      ...safeConfig,
      minimumStaff: { ...safeConfig.minimumStaff, [field]: value }
    });
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

  // Calculate totals
  const totals = useMemo(() => {
    let am = 0, pm = 0, full = 0;
    safeConfig.weeklySchedule.forEach(day => {
      am += day.minAM || 0;
      pm += day.minPM || 0;
      full += day.minFullDay || 0;
    });
    return { am, pm, full, total: am + pm + full };
  }, [safeConfig.weeklySchedule]);

  return (
    <div className="space-y-6">
      {/* Coverage Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Coverage Mode
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'split', label: 'Split Shifts Only', desc: 'AM + PM shifts, no full day' },
            { id: 'flexible', label: 'Flexible', desc: 'Solver decides optimal mix' },
            { id: 'fullDayOnly', label: 'Full Day Only', desc: 'Single person coverage' }
          ].map(mode => (
            <button
              key={mode.id}
              type="button"
              onClick={() => updateCoverageMode(mode.id as 'split' | 'flexible' | 'fullDayOnly')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                safeConfig.coverageMode === mode.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`font-medium ${
                safeConfig.coverageMode === mode.id ? 'text-blue-700' : 'text-gray-900'
              }`}>
                {mode.label}
              </div>
              <div className="text-xs text-gray-500 mt-1">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Minimum Staff Levels */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Minimum Staff Levels
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <label className="block text-sm text-gray-600 mb-2">At Opening</label>
            <input
              type="number"
              min="1"
              max="10"
              value={safeConfig.minimumStaff.atOpening}
              onChange={e => updateMinimumStaff('atOpening', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <label className="block text-sm text-gray-600 mb-2">At Closing</label>
            <input
              type="number"
              min="1"
              max="10"
              value={safeConfig.minimumStaff.atClosing}
              onChange={e => updateMinimumStaff('atClosing', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">
            Weekly Schedule
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => applyToAllDays('minAM', 1)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              All AM=1
            </button>
            <button
              type="button"
              onClick={() => applyToAllDays('minPM', 1)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              All PM=1
            </button>
            <button
              type="button"
              onClick={() => applyToAllDays('maxStaff', 3)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              All Max=3
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Day</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Min AM</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Min PM</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Min Full</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Max Staff</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Mandatory</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, index) => (
                <tr key={day} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 font-medium text-gray-900">{day.slice(0, 3)}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={safeConfig.weeklySchedule[index]?.minAM || 0}
                      onChange={e => updateDayConfig(index, 'minAM', parseInt(e.target.value) || 0)}
                      disabled={safeConfig.coverageMode === 'fullDayOnly'}
                      className="w-16 px-2 py-1 border border-gray-200 rounded text-center disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={safeConfig.weeklySchedule[index]?.minPM || 0}
                      onChange={e => updateDayConfig(index, 'minPM', parseInt(e.target.value) || 0)}
                      disabled={safeConfig.coverageMode === 'fullDayOnly'}
                      className="w-16 px-2 py-1 border border-gray-200 rounded text-center disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={safeConfig.weeklySchedule[index]?.minFullDay || 0}
                      onChange={e => updateDayConfig(index, 'minFullDay', parseInt(e.target.value) || 0)}
                      disabled={safeConfig.coverageMode === 'split'}
                      className="w-16 px-2 py-1 border border-gray-200 rounded text-center disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={safeConfig.weeklySchedule[index]?.maxStaff || 3}
                      onChange={e => updateDayConfig(index, 'maxStaff', parseInt(e.target.value) || 3)}
                      className="w-16 px-2 py-1 border border-gray-200 rounded text-center"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
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
        </div>

        {/* Totals */}
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">Weekly Minimums:</span>
            <span className="font-medium text-blue-900">
              AM: {totals.am} | PM: {totals.pm} | Full: {totals.full} | Total: {totals.total}
            </span>
          </div>
        </div>
      </div>

      {/* Coverage Rules */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Coverage Rules
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <div className="font-medium text-gray-900">Full Day Counts as Both</div>
              <div className="text-sm text-gray-500">
                A full day shift counts toward both AM and PM requirements
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateRule('fullDayCountsAsBoth', !safeConfig.rules.fullDayCountsAsBoth)}
              className={`p-2 rounded-lg transition-colors ${
                safeConfig.rules.fullDayCountsAsBoth ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              {safeConfig.rules.fullDayCountsAsBoth ? (
                <ToggleRight className="w-8 h-8" />
              ) : (
                <ToggleLeft className="w-8 h-8" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <div className="font-medium text-gray-900">Never Below Minimum</div>
              <div className="text-sm text-gray-500">
                Enforce minimums as hard constraints (solver must meet them)
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateRule('neverBelowMinimum', !safeConfig.rules.neverBelowMinimum)}
              className={`p-2 rounded-lg transition-colors ${
                safeConfig.rules.neverBelowMinimum ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              {safeConfig.rules.neverBelowMinimum ? (
                <ToggleRight className="w-8 h-8" />
              ) : (
                <ToggleLeft className="w-8 h-8" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How this affects roster generation:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li><strong>Split:</strong> Only AM and PM shifts are created (no full day options)</li>
              <li><strong>Flexible:</strong> Solver chooses the best mix of AM, PM, and Full day shifts</li>
              <li><strong>Full Day Only:</strong> Single person covers the entire day (solo shops)</li>
              <li><strong>Mandatory days:</strong> Solver MUST meet the minimum (hard constraint)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffingConfigPanel;
