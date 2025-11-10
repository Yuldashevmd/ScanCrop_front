import { AuthProfile } from 'features/auth-profile';

export function HeaderUI() {
  return (
    <header className="bg-[#337ab7] h-[50px] w-full px-4 flex justify-center items-center text-white">
      <section className="max-w-[1080px] w-full flex justify-between items-center">
        <h2 className="text-xl font-semibold">Photo Cropper</h2>

        {/* AUTH */}
        <AuthProfile />
      </section>
    </header>
  );
}
