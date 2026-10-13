(() => {
  const button = document.getElementById('guide-copy');
  const message = document.getElementById('guide-message');
  const status = document.getElementById('guide-copy-status');
  if (!button || !message || !status) return;
  button.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(message.textContent);
      status.textContent = '상담 문구가 복사되었습니다.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(message);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      message.focus();
      status.textContent = '문구를 직접 선택하여 복사해 주세요. PC에서는 Ctrl+C 또는 ⌘+C를 사용할 수 있습니다.';
    }
  });
})();
