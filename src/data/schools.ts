/**
 * 学校数据模型与模拟数据
 */

export interface School {
  id: string;
  name: string;
  pinyin_initial: string;
  login_url: string;
  system_type: string;
}

export const SCHOOLS: School[] = [
  { id: '1', name: '北京化工大学', pinyin_initial: 'B', login_url: 'https://jwgl.buct.edu.cn', system_type: 'zhengfang' },
  { id: '2', name: '北京大学', pinyin_initial: 'B', login_url: 'https://dean.pku.edu.cn', system_type: 'custom' },
  { id: '3', name: '北京理工大学', pinyin_initial: 'B', login_url: 'https://jwgl.bit.edu.cn', system_type: 'zhengfang' },
  { id: '4', name: '北京航空航天大学', pinyin_initial: 'B', login_url: 'https://jwxt.buaa.edu.cn', system_type: 'zhengfang' },
  { id: '5', name: '长安大学', pinyin_initial: 'C', login_url: 'https://jw.chd.edu.cn', system_type: 'zhengfang' },
  { id: '6', name: '重庆大学', pinyin_initial: 'C', login_url: 'https://jwgl.cqu.edu.cn', system_type: 'zhengfang' },
  { id: '7', name: '大连理工大学', pinyin_initial: 'D', login_url: 'https://jwgl.dlut.edu.cn', system_type: 'zhengfang' },
  { id: '8', name: '电子科技大学', pinyin_initial: 'D', login_url: 'https://jwxt.uestc.edu.cn', system_type: 'zhengfang' },
  { id: '9', name: '复旦大学', pinyin_initial: 'F', login_url: 'https://jwfw.fudan.edu.cn', system_type: 'custom' },
  { id: '10', name: '广州大学', pinyin_initial: 'G', login_url: 'https://jwgl.gzhu.edu.cn', system_type: 'zhengfang' },
  { id: '11', name: '哈尔滨工业大学', pinyin_initial: 'H', login_url: 'https://jwts.hit.edu.cn', system_type: 'zhengfang' },
  { id: '12', name: '华南理工大学', pinyin_initial: 'H', login_url: 'https://jw.scut.edu.cn', system_type: 'zhengfang' },
  { id: '13', name: '华中科技大学', pinyin_initial: 'H', login_url: 'https://jwgl.hust.edu.cn', system_type: 'zhengfang' },
  { id: '14', name: '吉林大学', pinyin_initial: 'J', login_url: 'https://jwgl.jlu.edu.cn', system_type: 'zhengfang' },
  { id: '15', name: '兰州大学', pinyin_initial: 'L', login_url: 'https://jwk.lzu.edu.cn', system_type: 'zhengfang' },
  { id: '16', name: '南京大学', pinyin_initial: 'N', login_url: 'https://jw.nju.edu.cn', system_type: 'custom' },
  { id: '17', name: '南开大学', pinyin_initial: 'N', login_url: 'https://jwgl.nankai.edu.cn', system_type: 'zhengfang' },
  { id: '18', name: '清华大学', pinyin_initial: 'Q', login_url: 'https://zhjw.tsinghua.edu.cn', system_type: 'custom' },
  { id: '19', name: '山东大学', pinyin_initial: 'S', login_url: 'https://jwxt.sdu.edu.cn', system_type: 'zhengfang' },
  { id: '20', name: '上海交通大学', pinyin_initial: 'S', login_url: 'https://i.sjtu.edu.cn', system_type: 'custom' },
  { id: '21', name: '四川大学', pinyin_initial: 'S', login_url: 'https://jwgl.scu.edu.cn', system_type: 'zhengfang' },
  { id: '22', name: '天津大学', pinyin_initial: 'T', login_url: 'https://jwgl.tju.edu.cn', system_type: 'zhengfang' },
  { id: '23', name: '武汉大学', pinyin_initial: 'W', login_url: 'https://jwgl.whu.edu.cn', system_type: 'zhengfang' },
  { id: '24', name: '西安交通大学', pinyin_initial: 'X', login_url: 'https://jwgl.xjtu.edu.cn', system_type: 'zhengfang' },
  { id: '25', name: '厦门大学', pinyin_initial: 'X', login_url: 'https://jw.xmu.edu.cn', system_type: 'zhengfang' },
  { id: '26', name: '浙江大学', pinyin_initial: 'Z', login_url: 'https://jwbinfosys.zju.edu.cn', system_type: 'zhengfang' },
  { id: '27', name: '中国人民大学', pinyin_initial: 'Z', login_url: 'https://jw.ruc.edu.cn', system_type: 'zhengfang' },
  { id: '28', name: '中山大学', pinyin_initial: 'Z', login_url: 'https://jwgl.sysu.edu.cn', system_type: 'zhengfang' },
];

const RECENT_KEY = 'recent_schools';

export function getRecentSchools(): School[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function saveRecentSchool(school: School) {
  const recent = getRecentSchools().filter(s => s.id !== school.id);
  recent.unshift(school);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 3)));
}
