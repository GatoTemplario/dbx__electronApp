export function initResizers() {
    console.log("Init resizers");
    
  const table = document.getElementById('fileTable');
  const resizers = table.querySelectorAll('.resizer');

  let currentResizer;
  let x;
  let w;

  function mouseDownHandler(e) {
    console.log("Mouse down handler");
    
    currentResizer = e.target;
    const th = currentResizer.closest('th');
    x = e.clientX;
    w = th.offsetWidth;

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);

    th.classList.add('resizing');
  }

  function mouseMoveHandler(e) {
    console.log("Mouse move handler");
    
    if (!currentResizer) return;

    const dx = e.clientX - x;
    const th = currentResizer.closest('th');
    th.style.width = `${w + dx}px`;
  }

  function mouseUpHandler() {
    console.log("Mouse up handler");
    
    if (!currentResizer) return;

    const th = currentResizer.closest('th');
    th.classList.remove('resizing');
    currentResizer = null;

    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
  }

  resizers.forEach((resizer) => {
    resizer.addEventListener('mousedown', mouseDownHandler);
  });
}