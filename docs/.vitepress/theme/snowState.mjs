// 首页雪花的状态放在模块里，跨页面保留：在站内切到别的页面再回到首页时，
// 接着用同一批雪（同一套方程，按真实时间继续），而不是重新撒一遍
export const kept = { flakes: null, width: 0, height: 0, originX: 0, originY: 0 }
