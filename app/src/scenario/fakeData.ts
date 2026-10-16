import { pick, rnd } from '../effects';
import { CITIES } from '../effects/worldMap';
// PRD R13：IP 仅用文档/保留段；R8/R9：CVE 一律虚构年份
const DOC_NETS = ['192.0.2', '198.51.100', '203.0.113'];
export const fakeIp = () => `${pick(DOC_NETS)}.${rnd(1, 254)}`;
export const hex = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[rnd(0, 15)]).join('');
const PASSWORDS = ['123456', 'password', 'iloveyou', 'qwerty', 'admin', 'letmein', '密码123', 'iloveyou_mom', 'woaini1314'];
const USERS = ['张三', '李四', '王五', '橘猫管理员', 'admin', 'root'];

export type Vars = Record<string, string>;
/** 替换占位符：{ip} {port} {hex} {hex:N} {num:a-b} {pick:a|b|c} {cve} {year[:YYYY]} {password} {user} {city} {target} 以及自定义 vars */
export function fill(tpl: string, vars: Vars = {}): string {
  return tpl.replace(/\{(\w+)(?::([^}]*))?\}/g, (m, key: string, arg?: string) => {
    switch (key) {
      case 'ip': return fakeIp();
      case 'port': return String(rnd(1, 65535));
      case 'hex': return hex(arg ? Number(arg) || 8 : 8);
      case 'num': { const [a, b] = (arg ?? '0-100').split('-').map(Number); return String(rnd(a, b)); }
      case 'pick': return pick((arg ?? '').split('|'));
      case 'cve': return `CVE-2077-${rnd(1000, 9999)}`;
      case 'password': return pick(PASSWORDS);
      case 'user': return pick(USERS);
      case 'year': return arg && /^\d{4}$/.test(arg) ? arg : String(new Date().getFullYear());
      case 'city': return pick(CITIES).name;
      default: return key in vars ? vars[key] : m;
    }
  });
}
