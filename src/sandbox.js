function initResizers() {
    const table = document.getElementById('fileTable');
    const cols = table.querySelectorAll('th, td');
    const resizers = table.querySelectorAll('.resizer');
  
    let currentResizer;
    let nextCol;
    let x = 0;
    let w = 0;
    let nw = 0;
  
    function mouseDownHandler(e) {
      currentResizer = e.target;
      const parent = currentResizer.parentElement;
      nextCol = parent.nextElementSibling;
      x = e.clientX;
      w = parent.offsetWidth;
      if (nextCol) nw = nextCol.offsetWidth;
  
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
  
      currentResizer.classList.add('resizing');
    }
  
    function mouseMoveHandler(e) {
      const dx = e.clientX - x;
      const col = currentResizer.parentElement;
      const newWidth = w + dx;
      const minWidth = 50; // Minimum width for a column
  
      if (newWidth > minWidth && nextCol && nw - dx > minWidth) {
        col.style.width = `${newWidth}px`;
        if (nextCol) nextCol.style.width = `${nw - dx}px`;
      }
    }
  
    function mouseUpHandler() {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      currentResizer.classList.remove('resizing');
    }
  
    resizers.forEach((resizer) => {
      resizer.addEventListener('mousedown', mouseDownHandler);
    });
  }