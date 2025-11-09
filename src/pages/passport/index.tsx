import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { BASE_URL } from 'shared/lib';

type PersonData = {
  [key: string]: string | undefined;
};

export function IDScannerPro() {
  const webcamRef = useRef<Webcam>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [personData, setPersonData] = useState<PersonData>({});
  const [loading, setLoading] = useState(false);

  const sendToBackend = async (file: File) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${BASE_URL}/passport/ocr`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setPersonData(data?.merged || {});
    } catch (err) {
      console.error(err);
      setPersonData({});
    } finally {
      setLoading(false);
    }
  };

  const captureFromWebcam = useCallback(() => {
    const img = webcamRef.current?.getScreenshot();
    if (!img) return;

    setImageSrc(img);

    fetch(img)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        sendToBackend(file);
      });
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageSrc(URL.createObjectURL(file));
    sendToBackend(file);
  };

  return (
    <div className="max-w-7xl mx-auto text-white p-6">
      <h1 className="text-3xl font-bold text-center mb-6">Universal ID & Passport Scanner</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Upload & Webcam */}
        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/30 p-4 rounded-lg">
            <label className="block mb-2">Rasm yuklash</label>
            <input type="file" accept="image/*" onChange={handleUpload} />
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/30 p-4 rounded-lg">
            <label className="block mb-2">Webcam orqali suratga olish</label>
            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full rounded-lg" />
            <button
              onClick={captureFromWebcam}
              disabled={loading}
              className="mt-2 w-full py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Tahlil qilinmoqda...' : 'Suratga olish'}
            </button>
          </div>

          {imageSrc && (
            <div className="bg-white/10 backdrop-blur-md border border-white/30 p-4 rounded-lg max-h-96 w-full overflow-y-auto">
              <img src={imageSrc} alt="preview" className="w-full rounded-lg" />
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="bg-white/10 backdrop-blur-md border border-white/30 p-6 rounded-xl">
          <GreenCardView personData={personData} />
        </div>
      </div>
    </div>
  );
}

interface Props {
  personData: PersonData;
}

export const GreenCardView: React.FC<Props> = ({ personData }) => {
  if (!personData || Object.keys(personData).length === 0) {
    return <div className="text-sm">Hech qanday ma’lumot topilmadi</div>;
  }

  const data = [
    {
      label: 'Ism',
      value: personData.first_name || '—',
    },
    {
      label: 'Familiya',
      value: personData.last_name || '—',
    },
    {
      label: 'Otasining ismi',
      value: personData.father_name || '—',
    },
    {
      label: "Tug'ilgan sana",
      value: personData.birth_date,
    },
    {
      label: "Tug'ilgan joyi",
      value: personData.birth_place || '—',
    },
    {
      label: 'Passport / ID №',
      value: personData.document_number || '—',
    },
    {
      label: 'Registry №',
      value: personData.registry_number || '—',
    },
    {
      label: 'Berilgan sana',
      value: personData.issue_date || '—',
    },
    {
      label: 'Amal qilish muddati',
      value: personData.expiry_date || '—',
    },
    {
      label: 'Millati',
      value: personData.nationality || '—',
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Shaxsiy ma’lumotlar</h2>
      <ul className="grid space-y-4">
        {data.map((item, index) => (
          <li key={index} className="flex items-center justify-between">
            <span>{item.label}</span>
            <span>{item.value || '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
