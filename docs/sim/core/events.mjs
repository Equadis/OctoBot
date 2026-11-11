/** Stable min heap. Times are integer microseconds relative to pull. */
export class EventQueue {
  #heap = [];
  #sequence = 0;
  #now = 0;

  get size() { return this.#heap.length; }
  get now() { return this.#now; }

  schedule(time, type, payload = null, priority = 0) {
    if (!Number.isSafeInteger(time) || time < this.#now || !Number.isSafeInteger(priority)) {
      throw new RangeError('Event time must be an integer at or after the current time');
    }
    if (typeof type !== 'string' || !type) throw new TypeError('Event type is required');
    const event = { time, type, payload, priority, sequence: this.#sequence++ };
    this.#heap.push(event);
    let index = this.#heap.length - 1;
    while (index > 0) {
      const parent = (index - 1) >>> 1;
      if (!before(event, this.#heap[parent])) break;
      this.#heap[index] = this.#heap[parent];
      index = parent;
    }
    this.#heap[index] = event;
  }

  peek() { return this.#heap[0] ?? null; }

  next() {
    if (!this.#heap.length) return null;
    const first = this.#heap[0];
    const last = this.#heap.pop();
    if (this.#heap.length) {
      let index = 0;
      while (index * 2 + 1 < this.#heap.length) {
        let child = index * 2 + 1;
        if (child + 1 < this.#heap.length && before(this.#heap[child + 1], this.#heap[child])) child++;
        if (!before(this.#heap[child], last)) break;
        this.#heap[index] = this.#heap[child];
        index = child;
      }
      this.#heap[index] = last;
    }
    this.#now = first.time;
    return first;
  }

  clear() {
    this.#heap = [];
    this.#now = 0;
    this.#sequence = 0;
  }
}

function before(a, b) {
  return a.time < b.time || (a.time === b.time &&
    (a.priority < b.priority || (a.priority === b.priority && a.sequence < b.sequence)));
}
