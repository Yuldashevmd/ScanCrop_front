import i18next from 'i18next';
import type { ChangeEvent } from 'react';
import { useLang } from 'shared/lib';

import { Languages } from 'lucide-react';

export function ChangeLangugage() {
  const { locale } = useLang();

  const onChangeLanguage = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      i18next.changeLanguage(value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Languages className="w-5 h-5" />
      <select onChange={onChangeLanguage} defaultValue={locale} className="text-sm sm:text-base">
        <option className="text-black" value="ru">
          Ру
        </option>
        <option className="text-black" value="en">
          En
        </option>
        <option className="text-black" value="uz">
          Uz
        </option>
      </select>
    </div>
  );
}
