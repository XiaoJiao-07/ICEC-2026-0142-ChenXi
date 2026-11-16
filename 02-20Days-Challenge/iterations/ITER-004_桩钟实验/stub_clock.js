// 桩钟：把无参 new Date() 与 Date.now() 固定到指定时刻，用于受控实验
const RealDate = Date;
const FIXED = process.env.STUB_ISO || '2026-11-16T00:30:00+08:00';
class FakeDate extends RealDate {
  constructor(...a) { if (a.length === 0) { super(FIXED); } else { super(...a); } }
  static now() { return new RealDate(FIXED).getTime(); }
}
global.Date = FakeDate;
