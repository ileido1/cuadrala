import { Suspense } from 'react';
import ProfileData from './profile-data';
import ProfileLoading from './loading';

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <h1 className="page-heading">Mi Perfil</h1>
        <p className="text-body mt-2">Tu información personal</p>
      </div>
      <Suspense fallback={<ProfileLoading />}>
        <ProfileData />
      </Suspense>
    </div>
  );
}