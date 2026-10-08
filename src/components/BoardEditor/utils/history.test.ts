import { expect, it } from "vitest";
import { pushHistory } from "./history";
import { emptyBoard } from "../../../utils/board";
it("保留最近30步并清除重做，不修改原历史", () => {
  const document = emptyBoard(),
    history = {
      past: Array.from({ length: 30 }, () => document),
      future: [document],
    };
  const next = pushHistory(history, document);
  expect(next.past).toHaveLength(30);
  expect(next.future).toHaveLength(0);
  expect(history.future).toHaveLength(1);
});
