const FRIENDLY: Array<[RegExp, string]> = [
  [/SyntaxError/, "Erro de sintaxe: alguma parte do código não segue as regras do Python. Revise vírgulas, dois-pontos e parênteses."],
  [/IndentationError/, "Erro de indentação: as linhas dentro de um bloco (if, for, def...) precisam do mesmo recuo de espaços."],
  [/NameError/, "Nome não definido: você usou uma variável ou função antes de criá-la, ou digitou o nome errado."],
  [/TypeError/, "Erro de tipo: a operação não funciona com esse tipo de dado (ex: somar texto com número)."],
  [/ValueError/, "Valor inválido: o dado tem o tipo certo, mas o valor não é aceitável nessa operação."],
  [/ZeroDivisionError/, "Divisão por zero: não é possível dividir um número por zero."],
  [/IndexError/, "Índice fora do intervalo: você tentou acessar uma posição que não existe na lista/string."],
  [/KeyError/, "Chave não encontrada: essa chave não existe no dicionário."],
  [/AttributeError/, "Atributo inexistente: esse objeto não tem esse método ou propriedade."],
  [/ModuleNotFoundError|ImportError/, "Módulo não encontrado: confira o nome do módulo importado."],
];

/**
 * Pyodide prepends its own frames (`/lib/python…/_pyodide/_base.py`, the wrapper's `<exec>`) to every traceback.
 * Learners only need the frames of their own code, so keep the header, the `<seu código>` frames and the final
 * `XError: message` line (the unindented lines), and drop the rest.
 */
export function trimTraceback(raw: string): string {
  const out: string[] = [];
  let skipping = false;
  for (const line of raw.split("\n")) {
    const frame = /^\s*File "([^"]*)"/.exec(line);
    if (frame) skipping = !frame[1].startsWith("<seu código>");
    else if (/^\S/.test(line)) skipping = false; // header or the closing "XError: message"
    if (!skipping) out.push(line);
  }
  return out.join("\n");
}

/** Keeps the (trimmed) Python traceback for real learning but prepends a PT-BR explanation. */
export function explainError(stderr: string): { friendly: string; raw: string } {
  const match = FRIENDLY.find(([pattern]) => pattern.test(stderr));
  return {
    friendly: match?.[1] ?? "Ocorreu um erro ao executar o código. Leia a mensagem abaixo com calma.",
    raw: trimTraceback(stderr.trim()),
  };
}
