'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../utils/supabase';

export default function NewRoomPage() {
  const router = useRouter();
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert([{ is_anonymous: isAnonymous, status: 'voting' }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        // 방 생성자가 바로 접속 (로컬 스토리지에 생성자임을 기록할 수도 있음)
        localStorage.setItem(`is_host_${data.id}`, 'true');
        router.push(`/room/${data.id}`);
      }
    } catch (error) {
      console.error('방 생성 오류:', error);
      alert('방 생성 중 오류가 발생했습니다.');
      setIsCreating(false);
    }
  };

  return (
    <div className="home-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <header className="header" style={{ marginBottom: '40px' }}>
        <h1>새로운 투표 방 만들기</h1>
        <p>동료들과 함께 메뉴를 결정하세요!</p>
      </header>

      <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>투표 방식 선택</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: isAnonymous ? '2px solid #FF5A5F' : '1px solid #ddd', borderRadius: '12px', cursor: 'pointer' }}>
            <input 
              type="radio" 
              checked={isAnonymous} 
              onChange={() => setIsAnonymous(true)}
              style={{ width: '20px', height: '20px' }}
            />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>😎 익명 투표 (추천)</div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>누가 어디에 투표했는지 알 수 없습니다.</div>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: !isAnonymous ? '2px solid #FF5A5F' : '1px solid #ddd', borderRadius: '12px', cursor: 'pointer' }}>
            <input 
              type="radio" 
              checked={!isAnonymous} 
              onChange={() => setIsAnonymous(false)}
              style={{ width: '20px', height: '20px' }}
            />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>📝 기명 투표</div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>입장 시 닉네임을 입력해야 합니다.</div>
            </div>
          </label>
        </div>

        <button 
          onClick={createRoom} 
          disabled={isCreating}
          style={{
            width: '100%',
            padding: '16px',
            background: isCreating ? '#ccc' : '#1a1a1a',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isCreating ? 'not-allowed' : 'pointer'
          }}
        >
          {isCreating ? '방 생성 중...' : '투표 방 만들기 🚀'}
        </button>
      </div>
      
      <button 
        onClick={() => router.back()}
        style={{ marginTop: '24px', background: 'transparent', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer' }}
      >
        뒤로 가기
      </button>
    </div>
  );
}
