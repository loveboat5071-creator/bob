'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../utils/supabase';
import confetti from 'canvas-confetti';

interface Room {
  id: string;
  status: string;
  is_anonymous: boolean;
  created_at: string;
}

interface Candidate {
  id: string;
  room_id: string;
  name: string;
  address: string | null;
  place_url: string | null;
  added_by: string;
}

interface Vote {
  id: string;
  candidate_id: string;
  user_id: string;
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 사용자 세션
  const [userId, setUserId] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  // 식당 검색 및 추가
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // 세션 초기화
    let uid = localStorage.getItem('ojeom_user_id');
    if (!uid) {
      uid = crypto.randomUUID();
      localStorage.setItem('ojeom_user_id', uid);
    }
    setUserId(uid);

    let localNick = localStorage.getItem('ojeom_nickname');
    if (localNick) setNickname(localNick);

    const hostStatus = localStorage.getItem(`is_host_${roomId}`);
    if (hostStatus === 'true') setIsHost(true);

    fetchInitialData();

    // Supabase Realtime 구독
    const channel = supabase.channel(`room_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates', filter: `room_id=eq.${roomId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          setCandidates(prev => [...prev, payload.new as Candidate]);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${roomId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          setVotes(prev => [...prev, payload.new as Vote]);
        } else if (payload.eventType === 'DELETE') {
          setVotes(prev => prev.filter(v => v.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, payload => {
        setRoom(payload.new as Room);
        if (payload.new.status === 'completed') {
          fireConfetti();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // 방 정보 가져오기
      const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      if (roomData) {
        setRoom(roomData);
        if (!roomData.is_anonymous && !nickname) {
          setShowNicknameModal(true);
        }
      }

      // 후보 가져오기
      const { data: candData } = await supabase.from('candidates').select('*').eq('room_id', roomId);
      if (candData) setCandidates(candData);

      // 투표 가져오기
      const { data: voteData } = await supabase.from('votes').select('*').eq('room_id', roomId);
      if (voteData) setVotes(voteData);

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNickname = () => {
    if (!nickname.trim()) return alert('닉네임을 입력해주세요.');
    localStorage.setItem('ojeom_nickname', nickname);
    setShowNicknameModal(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKeyword.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/geocode?query=${encodeURIComponent(searchKeyword)}`);
      const data = await res.json();
      if (data.documents) {
        setSearchResults(data.documents);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const addCandidate = async (place: any = null) => {
    const name = place ? place.place_name : searchKeyword;
    if (!name.trim()) return;

    try {
      await supabase.from('candidates').insert([{
        room_id: roomId,
        name: name,
        address: place ? (place.road_address_name || place.address_name) : null,
        place_url: place ? place.place_url : null,
        added_by: room?.is_anonymous ? '익명' : (nickname || '익명')
      }]);
      setSearchKeyword('');
      setSearchResults([]);
    } catch (e) {
      console.error('후보 추가 에러', e);
    }
  };

  const toggleVote = async (candidateId: string) => {
    if (room?.status === 'completed') return;

    // 이미 투표했는지 확인 (1인 1표)
    const myExistingVote = votes.find(v => v.user_id === userId);

    if (myExistingVote) {
      if (myExistingVote.candidate_id === candidateId) {
        // 이미 투표한 항목을 다시 누르면 취소
        await supabase.from('votes').delete().eq('id', myExistingVote.id);
        return;
      } else {
        // 다른 곳에 투표했으면 이전 투표 취소 후 새로 투표
        await supabase.from('votes').delete().eq('id', myExistingVote.id);
      }
    }

    // 새 투표 추가
    await supabase.from('votes').insert([{
      room_id: roomId,
      candidate_id: candidateId,
      user_id: userId
    }]);
  };

  const endVoting = async () => {
    if (!confirm('투표를 마감하시겠습니까?')) return;
    await supabase.from('rooms').update({ status: 'completed' }).eq('id', roomId);
  };

  const fireConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('초대 링크가 복사되었습니다! 동료들에게 공유하세요.');
    });
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>;
  if (!room) return <div style={{ padding: '40px', textAlign: 'center' }}>방을 찾을 수 없습니다.</div>;

  // 결과 계산
  const getVoteCount = (cId: string) => votes.filter(v => v.candidate_id === cId).length;
  const sortedCandidates = [...candidates].sort((a, b) => getVoteCount(b.id) - getVoteCount(a.id));
  const maxVotes = sortedCandidates.length > 0 ? getVoteCount(sortedCandidates[0].id) : 0;

  return (
    <div className="home-wrapper" style={{ paddingBottom: '100px' }}>
      <header className="header" style={{ marginBottom: '20px' }}>
        <h1 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          실시간 메뉴 투표
          <button onClick={handleCopyLink} style={{ fontSize: '14px', padding: '6px 12px', borderRadius: '8px', background: '#e0e0e0', border: 'none', cursor: 'pointer' }}>
            🔗 링크 복사
          </button>
        </h1>
        <p>
          {room.is_anonymous ? '😎 익명 모드' : '📝 기명 모드'} | {room.status === 'voting' ? '투표 진행 중 🟢' : '투표 종료 🛑'}
        </p>
      </header>

      {/* 닉네임 모달 */}
      {showNicknameModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '16px' }}>닉네임을 입력해주세요</h3>
            <input 
              type="text" 
              value={nickname} 
              onChange={e => setNickname(e.target.value)}
              placeholder="예: 홍길동"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '16px' }}
            />
            <button onClick={saveNickname} style={{ width: '100%', padding: '12px', background: '#1a1a1a', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>입장하기</button>
          </div>
        </div>
      )}

      {/* 후보 추가 영역 */}
      {room.status === 'voting' && (
        <div style={{ background: 'white', padding: '16px', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input 
              type="text" 
              placeholder="먹고 싶은 식당 이름 검색 (또는 직접 입력)" 
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
            />
            <button type="submit" style={{ padding: '0 16px', background: '#FF5A5F', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>
              검색
            </button>
          </form>

          {isSearching && <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>검색 중...</div>}

          {searchResults.length > 0 && (
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', marginBottom: '12px' }}>
              {searchResults.map((place, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #eee' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{place.place_name}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{place.address_name}</div>
                  </div>
                  <button onClick={() => addCandidate(place)} style={{ padding: '6px 12px', background: '#f0f0f0', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    후보 등록
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {searchKeyword.trim() && searchResults.length === 0 && !isSearching && (
             <button onClick={() => addCandidate()} style={{ width: '100%', padding: '10px', background: '#f8f9fa', border: '1px dashed #ccc', borderRadius: '8px', color: '#555', cursor: 'pointer' }}>
               "{searchKeyword}" 직접 후보로 등록하기
             </button>
          )}
        </div>
      )}

      {/* 후보 및 투표 리스트 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedCandidates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>아직 등록된 식당 후보가 없습니다.</div>
        ) : (
          sortedCandidates.map(candidate => {
            const vCount = getVoteCount(candidate.id);
            const myVote = votes.find(v => v.user_id === userId && v.candidate_id === candidate.id);
            const isWinner = room.status === 'completed' && vCount === maxVotes && vCount > 0;

            return (
              <div key={candidate.id} style={{ 
                background: 'white', 
                padding: '16px', 
                borderRadius: '16px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                border: isWinner ? '2px solid #FFD700' : (myVote ? '2px solid #FF5A5F' : '1px solid #eee'),
                boxShadow: isWinner ? '0 0 15px rgba(255, 215, 0, 0.3)' : '0 2px 5px rgba(0,0,0,0.02)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isWinner && <span style={{ fontSize: '20px' }}>👑</span>}
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#1a1a1a' }}>{candidate.name}</h3>
                  </div>
                  {candidate.address && <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{candidate.address}</div>}
                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '6px' }}>추천인: {candidate.added_by}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: myVote ? '#FF5A5F' : '#333' }}>{vCount}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>표</div>
                  </div>
                  
                  {room.status === 'voting' && (
                    <button 
                      onClick={() => toggleVote(candidate.id)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        background: myVote ? '#FF5A5F' : '#f0f0f0',
                        color: myVote ? 'white' : '#555',
                        transition: 'all 0.2s'
                      }}
                    >
                      {myVote ? '투표 취소' : '투표하기'}
                    </button>
                  )}
                  {candidate.place_url && (
                    <a href={candidate.place_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#1565C0', textDecoration: 'none', padding: '8px' }}>
                      지도보기
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 방장 컨트롤 */}
      {isHost && room.status === 'voting' && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', zIndex: 100 }}>
          <button 
            onClick={endVoting}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#1a1a1a', color: 'white', fontWeight: 'bold', fontSize: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', cursor: 'pointer' }}
          >
            🛑 투표 마감하고 결과 보기
          </button>
        </div>
      )}

      {room.status === 'completed' && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', zIndex: 100 }}>
          <button 
            onClick={() => window.location.href = '/'}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'white', color: '#1a1a1a', fontWeight: 'bold', fontSize: '16px', border: '1px solid #ccc', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', cursor: 'pointer' }}
          >
            🏠 홈으로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
}
