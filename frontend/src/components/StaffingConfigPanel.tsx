// frontend/src/components/StaffingConfigPanel.tsx
import React from 'react';
import type { StaffingConfig, CoverageMode, DayStaffingConfig } from '../types';

interface StaffingConfigPanelProps {
  config: StaffingConfig;
  onChange: (config: StaffingConfig) => void;
  shopName?: string;
}

export const StaffingConfigPanel: React.FC<StaffingConfigPanelProps> = ({
  config,
  onChange,
  shopName = 'Shop'
}) => {
  
  const updateCoverageMode = (mode: CoverageMode) => {
    onChange({ ...config, coverageMode: mode });
  };

  const updateMinimumStaff = (field: 'atOpening' | 'atClosing', value: number) => {
    onChange({
      ...config,
      minimumStaff: { ...config.minimumStaff, [field]: Math.max(0, value) }
    });
  };

  const updateDayConfig = (dayIndex: number, field: keyof DayStaffingConfig, value: number | boolean) => {
    const newSchedule = [...config.weeklySchedule];
    newSchedule[dayIndex] = { 
      ...newSchedule[dayIndex], 
      [field]: typeof value === 'number' ? Math.max(0, value) : value 
    };
    onChange({ ...config, weeklySchedule: newSchedule });
  };

  const updateRule = (rule: keyof StaffingConfig['rules'], value: boolean) => {
    onChange({
      ...config,
      rules: { ...config.rules, [rule]: value }
    });
  };

  const applyToAllDays = (field: 'minAM' | 'minPM' | 'minFullDay' | 'maxStaff', value: number) => {
    const newSchedule = config.weeklySchedule.map(day => ({
      ...day,
      [field]: Math.max(0, value)
    }));
    onChange({ ...config, weeklySchedule: newSchedule });
  };

  // Calculate totals
  const totals = config.weeklySchedule.reduce(
    (acc, day) => ({
      am: acc.am + day.minAM,
      pm: acc.pm + day.minPM,
      full: acc.full + day.minFullDay,
      max: acc.max + day.maxStaff,
    }),
    { am: 0, pm: 0, full: 0, max: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Coverage Mode */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">1</span>
          Coverage Mode
        </h3>
        <div className="space-y-2">
          {[
            { value: 'split' as CoverageMode, label: 'Split Shifts Only', desc: 'AM + PM shifts, no full days allowed' },
            { value: 'flexible' as CoverageMode, label: 'Flexible', desc: 'Solver chooses best mix of AM, PM, and Full Day' },
            { value: 'fullDayOnly' as CoverageMode, label: 'Full Day Only', desc: 'Single person covers entire day (solo shop)' },
          ].map(option => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                config.coverageMode === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="coverageMode"
                value={option.value}
                checked={config.coverageMode === option.value}
                onChange={() => updateCoverageMode(option.value)}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500">{option.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Minimum Staff Levels */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">2</span>
          Minimum Staff Levels
        </h3>
        <p className="text-xs text-gray-500 mb-4">Hard limits - the shop can never have fewer staff than this at any time</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">At Opening</label>
            <input
              type="number"
              min="0"
              max="10"
              value={config.minimumStaff.atOpening}
              onChange={(e) => updateMinimumStaff('atOpening', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">At Closing</label>
            <input
              type="number"
              min="0"
              max="10"
              value={config.minimumStaff.atClosing}
              onChange={(e) => updateMinimumStaff('atClosing', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">3</span>
          Weekly Schedule
        </h3>
        
        {/* Quick fill row */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-600 mb-2">Quick Fill (apply value to all days):</div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-gray-500">Min AM</label>
              <input
                type="number"
                min="0"
                placeholder="—"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    if (!isNaN(val)) {
                      applyToAllDays('minAM', val);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    applyToAllDays('minAM', val);
                    e.target.value = '';
                  }
                }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Min PM</label>
              <input
                type="number"
                min="0"
                placeholder="—"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    if (!isNaN(val)) {
                      applyToAllDays('minPM', val);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    applyToAllDays('minPM', val);
                    e.target.value = '';
                  }
                }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Min Full</label>
              <input
                type="number"
                min="0"
                placeholder="—"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    if (!isNaN(val)) {
                      applyToAllDays('minFullDay', val);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    applyToAllDays('minFullDay', val);
                    e.target.value = '';
                  }
                }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Max Staff</label>
              <input
                type="number"
                min="0"
                placeholder="—"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    if (!isNaN(val)) {
                      applyToAllDays('maxStaff', val);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    applyToAllDays('maxStaff', val);
                    e.target.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Schedule table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left py-2 px-1 font-medium w-16">Day</th>
                <th className="text-center py-2 px-1 font-medium">Min AM</th>
                <th className="text-center py-2 px-1 font-medium">Min PM</th>
                <th className="text-center py-2 px-1 font-medium">Min Full</th>
                <th className="text-center py-2 px-1 font-medium">Max Staff</th>
                <th className="text-center py-2 px-1 font-medium">Mandatory</th>
              </tr>
            </thead>
            <tbody>
              {config.weeklySchedule.map((day, idx) => (
                <tr 
                  key={day.day} 
                  className={`border-b border-gray-100 transition-colors ${
                    day.isMandatory ? 'bg-amber-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="py-2 px-1">
                    <span className={`font-semibold ${
                      day.day === 'Sun' ? 'text-red-600' : 
                      day.day === 'Sat' ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {day.day}
                    </span>
                  </td>
                  <td className="py-2 px-1 text-center">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={day.minAM}
                      onChange={(e) => updateDayConfig(idx, 'minAM', parseInt(e.target.value) || 0)}
                      disabled={config.coverageMode === 'fullDayOnly'}
                      className={`w-14 px-2 py-1.5 border rounded text-center text-sm font-medium transition-colors ${
                        config.coverageMode === 'fullDayOnly' 
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                          : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={day.minPM}
                      onChange={(e) => updateDayConfig(idx, 'minPM', parseInt(e.target.value) || 0)}
                      disabled={config.coverageMode === 'fullDayOnly'}
                      className={`w-14 px-2 py-1.5 border rounded text-center text-sm font-medium transition-colors ${
                        config.coverageMode === 'fullDayOnly' 
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                          : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={day.minFullDay}
                      onChange={(e) => updateDayConfig(idx, 'minFullDay', parseInt(e.target.value) || 0)}
                      disabled={config.coverageMode === 'split'}
                      className={`w-14 px-2 py-1.5 border rounded text-center text-sm font-medium transition-colors ${
                        config.coverageMode === 'split' 
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                          : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={day.maxStaff}
                      onChange={(e) => updateDayConfig(idx, 'maxStaff', parseInt(e.target.value) || 1)}
                      className="w-14 px-2 py-1.5 border border-gray-300 rounded text-center text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <input
                      type="checkbox"
                      checked={day.isMandatory}
                      onChange={(e) => updateDayConfig(idx, 'isMandatory', e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="text-xs font-semibold text-gray-600 mb-2">Weekly Totals (Minimum Required)</div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-blue-600">{totals.am}</div>
              <div className="text-xs text-gray-500">AM Shifts</div>
            </div>
            <div>
              <div className="text-xl font-bold text-orange-600">{totals.pm}</div>
              <div className="text-xs text-gray-500">PM Shifts</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-600">{totals.full}</div>
              <div className="text-xs text-gray-500">Full Day</div>
            </div>
            <div>
              <div className="text-xl font-bold text-purple-600">{totals.max}</div>
              <div className="text-xs text-gray-500">Max Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Coverage Rules */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">4</span>
          Coverage Rules
        </h3>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={config.rules.fullDayCountsAsBoth}
              onChange={(e) => updateRule('fullDayCountsAsBoth', e.target.checked)}
              className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-700">Full Day counts as BOTH AM and PM</div>
              <div className="text-xs text-gray-500">1 Full Day shift satisfies 1 AM + 1 PM requirement</div>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={config.rules.neverBelowMinimum}
              onChange={(e) => updateRule('neverBelowMinimum', e.target.checked)}
              className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-700">Never go below minimum staff</div>
              <div className="text-xs text-gray-500">Hard constraint - solver will fail if it can't meet minimums</div>
            </div>
          </label>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <div className="text-blue-500 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">How it works:</div>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>Min AM/PM/Full</strong>: Minimum shifts required (solver must meet these)</li>
              <li>• <strong>Max Staff</strong>: Maximum people allowed per day (won't exceed this)</li>
              <li>• <strong>Mandatory</strong>: These requirements are strict - solver will fail rather than under-staff</li>
              <li>• When <strong>Full Day counts as both</strong> is checked, 1 full day person = 1 AM + 1 PM coverage</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffingConfigPanel;
