import { Suspense } from 'react';
import ProfileData from './profile-data';
import ProfileLoading from './loading';

export default function ProfilePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h1>
      <Suspense fallback={<ProfileLoading />}>
        <ProfileData />
      </Suspense>
    </div>
  );
}
