import React from 'react';

interface MultiColumnProps {
  columns: number;
  children?: React.ReactNode;
}

const MultiColumn: React.FC<MultiColumnProps> = ({ columns, children }) => {
  const items = React.Children.toArray(children);

  function getColumnCss(colIdx: number): string {
      var columnCss = "grid-column"
      if (colIdx < columns - 1) {
          columnCss += " pr-1 border-r-1"
      }
      if (colIdx > 0) {
          columnCss += " pl-1"
      }
      return columnCss
  }

  return (
    <div className="grid" style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '0rem'
    }}>
      {Array.from({ length: columns }).map((_, colIdx) => (
        <div key={colIdx} className={getColumnCss(colIdx)} >
          {items[colIdx]}
        </div>
      ))}
    </div>
  );
};

export default MultiColumn;
