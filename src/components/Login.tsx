import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { googleConfigured, onReauthNeeded, requestToken, savedProfile } from '../lib/google';
import { IconHeart, IconSparkle } from './Icons';
import { Ornament } from './UI';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function LoginScreen() {
  const { session, busy, error, signIn, enterLocal, chooseSpace, newSpace, signOut } = useAuth();
  const remembered = session.status === 'signedOut' ? session.remembered : null;

  return (
    <div className="login">
      <motion.div
        className="login__card"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="login__seal"
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring', damping: 14 }}
        >
          <IconHeart size={30} />
        </motion.div>
        <p className="hero__eyebrow">Our little universe</p>
        <h1 className="login__title">
          Tôi <span className="hero__amp">&amp;</span> Bông
        </h1>

        <AnimatePresence mode="wait">
          {session.status === 'choosingSpace' ? (
            <motion.div key="spaces" className="login__body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="login__lead">
                Chào {session.profile.givenName}! {session.candidates.length ? 'Chọn cuốn nhật kí để mở:' : 'Chưa có cuốn nhật kí nào trên Drive của bạn.'}
              </p>
              {session.candidates.length > 0 && (
                <div className="spaces">
                  {session.candidates.map((c) => (
                    <button key={c.fileId} className="space" onClick={() => chooseSpace(c)}>
                      <IconSparkle size={18} />
                      <span>
                        <b>{c.ownedByMe ? 'Không gian của bạn' : `Được ${c.ownerName || c.ownerEmail} chia sẻ`}</b>
                        <small>Cập nhật {new Date(c.modifiedTime).toLocaleDateString('vi-VN')}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button className="btn btn--gold btn--lg" onClick={newSpace} disabled={busy}>
                {busy ? 'Đang tạo…' : 'Tạo cuốn nhật kí mới trên Drive'}
              </button>
              <p className="login__hint">
                Nếu người ấy đã tạo rồi, hãy nhờ họ vào <b>Cài đặt → Mời người ấy</b> và nhập email <b>{session.profile.email}</b>, sau đó
                đăng nhập lại.
              </p>
              <button className="login__link" onClick={signOut}>
                Dùng tài khoản khác
              </button>
            </motion.div>
          ) : (
            <motion.div key="signin" className="login__body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="login__lead">
                {remembered ? `Chào mừng trở lại, ${remembered.givenName} ♡` : 'Nơi cất giữ những kỉ niệm, chuyến đi và khoảnh khắc của hai đứa.'}
              </p>
              {googleConfigured ? (
                <button className="btn btn--light btn--lg" onClick={signIn} disabled={busy || session.status === 'boot'}>
                  <GoogleMark />
                  {busy ? 'Đang kết nối…' : remembered ? `Tiếp tục với ${remembered.email}` : 'Đăng nhập bằng Google'}
                </button>
              ) : (
                <p className="login__warn">
                  Chưa cấu hình Google Client ID nên chưa đăng nhập được. Xem hướng dẫn trong <code>SETUP-GOOGLE.md</code>.
                </p>
              )}
              <Ornament />
              <ul className="login__perks">
                <li>Ảnh và dữ liệu nằm trong Google Drive của chính bạn</li>
                <li>Hai tài khoản cùng xem, cùng viết, cùng chụp</li>
                <li>Dùng được trên điện thoại lẫn máy tính</li>
              </ul>
              <button className="login__link" onClick={enterLocal}>
                Dùng thử trên máy này (không đồng bộ)
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {error && <p className="login__error">{error}</p>}
      </motion.div>
    </div>
  );
}

/** Hiện khi token Google hết hạn giữa chừng — cần một cú bấm để mở popup. */
export function ReauthBanner() {
  const [need, setNeed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => onReauthNeeded(setNeed), []);
  return (
    <AnimatePresence>
      {need && (
        <motion.div className="reauth" initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }}>
          <span>Phiên đăng nhập Google đã hết hạn</span>
          <button
            className="btn btn--gold btn--sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await requestToken({ hint: savedProfile()?.email });
              } catch {
                /* người dùng có thể bấm lại */
              } finally {
                setBusy(false);
              }
            }}
          >
            Tiếp tục
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
