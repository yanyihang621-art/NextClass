import { Link } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

export default function Import() {
  return (
    <div className="bg-background text-on-surface min-h-screen pb-28 font-body">
      <main className="pt-6 px-4 max-w-2xl mx-auto">
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">school</span>
            <h3 className="text-xl font-bold font-headline">教务系统导入</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <button className="group relative p-6 rounded-dynamic bg-white border border-outline-variant/15 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors"></div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">account_balance</span>
                </div>
                <h4 className="text-xl font-bold">选择学校</h4>
              </div>
              <p className="text-on-surface-variant text-sm opacity-80 pl-16">支持全国 1000+ 所高校教务系统一键导入</p>
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">upload_file</span>
            <h3 className="text-xl font-bold font-headline">文件导入</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="group relative p-6 rounded-dynamic bg-white border border-outline-variant/15 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">table_chart</span>
              </div>
              <h4 className="text-lg font-bold mb-1">Excel 课表</h4>
              <p className="text-on-surface-variant text-xs opacity-70">支持 .xls, .xlsx 格式</p>
            </button>

            <button className="group relative p-6 rounded-dynamic bg-white border border-outline-variant/15 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left">
              <div className="w-10 h-10 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">description</span>
              </div>
              <h4 className="text-lg font-bold mb-1">PDF 课表</h4>
              <p className="text-on-surface-variant text-xs opacity-70">智能识别 PDF 课表内容</p>
            </button>

            <button className="group relative p-6 rounded-dynamic bg-white border border-outline-variant/15 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left md:col-span-2">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">calendar_today</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">ICS 日历文件</h4>
                  <p className="text-on-surface-variant text-xs opacity-70">导入标准日历格式文件</p>
                </div>
              </div>
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
