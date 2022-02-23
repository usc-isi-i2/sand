/** A utility to discard responses out of order */
export class SequentialFuncInvoker {
  private timer: number = 0;

  public exec<T>(fn: () => Promise<T>): Promise<T | undefined> {
    this.timer += 1;
    let calledAt = this.timer;

    return fn().then((result: any) => {
      if (calledAt < this.timer) {
        return undefined;
      }

      return result;
    });
  }
}
