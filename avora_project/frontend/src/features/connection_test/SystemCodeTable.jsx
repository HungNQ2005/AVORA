import React from 'react';
import { codeNameParser, getCodeVariant } from '../../utils/codeNameParser';
import './SystemCodeTable.css';

/**
 * SystemCodeTable — displays m_system_code records in a styled HTML table.
 * @param {{ data: Array<{business_cd: string, code_cd: string, code_name: string, sort_no: number}> }} props
 */
const SystemCodeTable = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="sct-empty">
        <span className="sct-empty__icon">📭</span>
        <p>Không có dữ liệu trong bảng <code>m_system_code</code>.</p>
      </div>
    );
  }

  return (
    <div className="sct-wrapper">
      <div className="sct-meta">
        <span className="sct-meta__table">m_system_code</span>
        <span className="sct-meta__count">{data.length} records</span>
      </div>
      <div className="sct-scroll">
        <table className="sct-table">
          <thead>
            <tr>
              <th>#</th>
              <th>business_cd</th>
              <th>code_cd</th>
              <th>code_name</th>
              <th>value</th>
              <th>sort_no</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 && console.log('[SCT] Sample row:', data[0])}
            {data.map((row, index) => {
              const parsedValue = codeNameParser(row.code_name);
              const variant = getCodeVariant(row.code_name);
              const isKnownCode = parsedValue !== row.code_name;

              return (
                <tr key={`${row.business_cd}-${row.code_cd}-${index}`}>
                  <td className="sct-table__index">{index + 1}</td>
                  <td>
                    <span className="sct-badge sct-badge--blue">{row.business_cd ?? '—'}</span>
                  </td>
                  <td>
                    <code className="sct-code">{row.code_cd ?? '—'}</code>
                  </td>
                  <td className="sct-table__name">{row.code_name ?? '—'}</td>
                  <td>
                    {isKnownCode ? (
                      <span className={`sct-value-badge sct-value-badge--${variant}`}>
                        {parsedValue}
                      </span>
                    ) : (
                      <span className="sct-value-badge sct-value-badge--default">—</span>
                    )}
                  </td>
                  <td className="sct-table__sort">{row.sort_no ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemCodeTable;
