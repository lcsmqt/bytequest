export function promptPlayerName(parent: HTMLElement): Promise<string> {
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.className = "bq-modal";
    modal.innerHTML = `
      <div class="bq-modal__box">
        <p class="pixel-title" style="font-size:0.9rem">Quem é você, Coder?</p>
        <input type="text" maxlength="16" placeholder="Seu nome" />
        <button class="bq-btn bq-btn--primary" data-action="confirm">Começar Jornada</button>
      </div>
    `;
    parent.appendChild(modal);
    const input = modal.querySelector("input")!;
    input.focus();

    const confirm = () => {
      const name = input.value.trim() || "Coder";
      modal.remove();
      resolve(name);
    };
    modal.querySelector('[data-action="confirm"]')!.addEventListener("click", confirm);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirm();
    });
  });
}
