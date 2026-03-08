export function showToast(message: string, title: string = 'SafeTech') {

  const container = document.createElement('div');
  container.className = 'global-toast-container';

  container.innerHTML = `
    <div class="global-toast">
      <div class="global-toast-title">${title}</div>
      <div class="global-toast-message">${message}</div>
      <button class="global-toast-btn">OK</button>
    </div>
  `;

  document.body.appendChild(container);

  const btn = container.querySelector('button');

  btn?.addEventListener('click', () => {
    container.remove();
  });

}