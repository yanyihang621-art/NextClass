import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { SCHOOLS, getRecentSchools, saveRecentSchool, type School } from '../data/schools';

interface SchoolSelectorProps {
  onSelect: (school: School) => void;
  onBack: () => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function SchoolSelector({ onSelect, onBack }: SchoolSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSchools, setRecentSchools] = useState<School[]>(getRecentSchools());
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [isTouching, setIsTouching] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Build grouped data
  const groupedSchools = useMemo(() => {
    const filtered = searchQuery.trim()
      ? SCHOOLS.filter(s => s.name.includes(searchQuery.trim()))
      : SCHOOLS;

    const groups: Record<string, School[]> = {};
    filtered.forEach(school => {
      const letter = school.pinyin_initial;
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(school);
    });

    return Object.keys(groups)
      .sort()
      .map(letter => ({ letter, schools: groups[letter] }));
  }, [searchQuery]);

  // Letters that actually have schools
  const activeLetters = useMemo(() => {
    const set = new Set(groupedSchools.map(g => g.letter));
    if (recentSchools.length > 0 && !searchQuery) set.add('★');
    return set;
  }, [groupedSchools, recentSchools, searchQuery]);

  const scrollToLetter = useCallback((letter: string) => {
    setActiveLetter(letter);
    const key = letter === '★' ? 'recent' : letter;
    const el = sectionRefs.current[key];
    if (el && listRef.current) {
      const containerTop = listRef.current.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      listRef.current.scrollTop += elTop - containerTop;
    }
  }, []);

  // Handle touch on letter bar
  const handleLetterTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el.getAttribute('data-letter')) {
      const letter = el.getAttribute('data-letter')!;
      scrollToLetter(letter);
    }
  }, [scrollToLetter]);

  const handleSelect = useCallback((school: School) => {
    saveRecentSchool(school);
    setRecentSchools(getRecentSchools());
    onSelect(school);
  }, [onSelect]);

  // Intersection observer to track active section
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !isTouching) {
            const letter = entry.target.getAttribute('data-section');
            if (letter) setActiveLetter(letter);
          }
        }
      },
      { root: container, threshold: 0.3 }
    );

    Object.values(sectionRefs.current).forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [groupedSchools, isTouching]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#F7F7F9] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#F7F7F9] sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-200 transition-colors">
          <span className="material-symbols-outlined text-slate-800">arrow_back_ios_new</span>
        </button>
        <h3 className="text-lg font-bold flex-1">选择学校</h3>
      </div>

      {/* Search bar */}
      <div className="px-4 pb-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xl">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索学校名称..."
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-sm text-slate-800 placeholder:text-slate-300"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div ref={listRef} className="flex-1 overflow-y-auto relative">
        <div className="pr-8">
          {/* Recent schools */}
          {recentSchools.length > 0 && !searchQuery && (
            <div
              ref={el => { sectionRefs.current['recent'] = el; }}
              data-section="★"
            >
              <div className="sticky top-0 z-[5] bg-[#F7F7F9] px-4 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base fill">history</span>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">最近选择</span>
                </div>
              </div>
              {recentSchools.map(school => (
                <SchoolItem key={`recent-${school.id}`} school={school} onSelect={handleSelect} />
              ))}
            </div>
          )}

          {/* Grouped list */}
          {groupedSchools.map(group => (
            <div
              key={group.letter}
              ref={el => { sectionRefs.current[group.letter] = el; }}
              data-section={group.letter}
            >
              <div className="sticky top-0 z-[5] bg-[#F7F7F9] px-4 py-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{group.letter}</span>
              </div>
              {group.schools.map(school => (
                <SchoolItem key={school.id} school={school} onSelect={handleSelect} />
              ))}
            </div>
          ))}

          {groupedSchools.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-3">search_off</span>
              <p className="text-sm font-medium">未找到匹配的学校</p>
              <p className="text-xs mt-1">试试换个关键词？</p>
            </div>
          )}
        </div>

        {/* Right-side letter index bar */}
        <div
          className="fixed right-1 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
          onTouchStart={(e) => { setIsTouching(true); handleLetterTouch(e); }}
          onTouchMove={handleLetterTouch}
          onTouchEnd={() => setIsTouching(false)}
        >
          {recentSchools.length > 0 && !searchQuery && (
            <button
              data-letter="★"
              onClick={() => scrollToLetter('★')}
              className={`w-5 h-5 flex items-center justify-center text-[9px] font-bold rounded-full transition-all ${
                activeLetter === '★'
                  ? 'bg-primary text-white scale-125'
                  : 'text-slate-400 hover:text-primary'
              }`}
            >
              ★
            </button>
          )}
          {ALPHABET.map(letter => (
            <button
              key={letter}
              data-letter={letter}
              onClick={() => scrollToLetter(letter)}
              className={`w-5 h-4 flex items-center justify-center text-[9px] font-bold rounded-full transition-all ${
                activeLetter === letter
                  ? 'bg-primary text-white scale-125'
                  : activeLetters.has(letter)
                    ? 'text-slate-500 hover:text-primary'
                    : 'text-slate-200'
              }`}
              disabled={!activeLetters.has(letter)}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Letter indicator bubble */}
        {isTouching && activeLetter && (
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-16 h-16 rounded-2xl bg-primary/90 flex items-center justify-center shadow-xl">
            <span className="text-white text-3xl font-black">{activeLetter}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SchoolItem({ school, onSelect }: { school: School; onSelect: (s: School) => void }) {
  return (
    <button
      onClick={() => onSelect(school)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/60 active:bg-white transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-primary text-lg">school</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{school.name}</p>
        <p className="text-[11px] text-slate-400 truncate">{school.system_type} · {school.login_url}</p>
      </div>
      <span className="material-symbols-outlined text-slate-200 text-base flex-shrink-0">chevron_right</span>
    </button>
  );
}
