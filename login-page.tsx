'use client';

import { useState } from 'react';
import { authApi } from '@/lib/api';

interface LoginPageProps {
  onLogin: (user: { role: 'teacher' | 'student'; name: string; id?: string; class_name?: string; avatar_emoji?: string }) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [isTeacher, setIsTeacher] = useState(false);
  const [usePin, setUsePin] = useState(false);
  const [studentNo, setStudentNo] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authApi.login(studentNo, password, isTeacher);
      onLogin(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authApi.loginWithPin(studentNo || 'teacher', pin);
      onLogin(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN 码错误');
    } finally {
      setLoading(false);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handlePinDelete = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🦉</div>
          <h1 className="text-3xl font-bold text-gray-800">课上小伴</h1>
          <p className="text-gray-600 mt-2">教学互动助手</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Role Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsTeacher(false);
                setUsePin(false);
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                !isTeacher
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              学生登录
            </button>
            <button
              type="button"
              onClick={() => {
                setIsTeacher(true);
                setUsePin(false);
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                isTeacher
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              教师登录
            </button>
          </div>

          {isTeacher && (
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setUsePin(false)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  !usePin
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                密码登录
              </button>
              <button
                type="button"
                onClick={() => setUsePin(true)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  usePin
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                PIN 码登录
              </button>
            </div>
          )}

          {usePin && isTeacher ? (
            /* PIN Login */
            <form onSubmit={handlePinLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  教师账号
                </label>
                <input
                  type="text"
                  value={studentNo}
                  onChange={(e) => setStudentNo(e.target.value)}
                  placeholder="请输入教师账号（默认 teacher）"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  4 位 PIN 码
                </label>
                <div className="flex gap-2 justify-center mb-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${
                        pin.length > i
                          ? 'border-amber-500 bg-amber-50 text-amber-600'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      {pin.length > i ? '●' : ''}
                    </div>
                  ))}
                </div>

                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((digit) => (
                    <button
                      key={digit}
                      type={digit ? 'button' : undefined}
                      onClick={() => {
                        if (digit === '') {
                          handlePinDelete();
                        } else if (digit) {
                          handlePinInput(digit);
                        }
                      }}
                      disabled={!digit}
                      className={`py-3 rounded-lg font-medium text-lg transition-all ${
                        digit
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 active:bg-gray-300'
                          : 'bg-transparent cursor-default'
                      }`}
                    >
                      {digit}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || pin.length !== 4}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '登录中...' : '登录'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                首次使用请先用密码登录后设置 PIN 码
              </p>
            </form>
          ) : (
            /* Password Login */
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              {isTeacher && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    教师账号
                  </label>
                  <input
                    type="text"
                    value={studentNo}
                    onChange={(e) => setStudentNo(e.target.value)}
                    placeholder="请输入教师账号（默认 teacher）"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              )}

              {!isTeacher && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    学号
                  </label>
                  <input
                    type="text"
                    value={studentNo}
                    onChange={(e) => setStudentNo(e.target.value)}
                    placeholder="请输入学号"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {isTeacher && (
                <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  默认密码：teacher123
                </p>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          )}

          {!isTeacher && (
            <p className="text-xs text-gray-500 text-center mt-4">
              首次登录请联系老师获取初始密码
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
