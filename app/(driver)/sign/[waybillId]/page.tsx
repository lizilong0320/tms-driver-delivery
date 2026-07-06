'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

type SignType = 'signature' | 'photo' | 'proxy';

interface WaybillInfo {
  id: string;
  waybillNo: string;
  receiverName: string;
  receiverAddress: string;
  packageCount: number;
}

const PROXY_RELATIONS = ['家人', '同事', '门卫', '其他'];
const EXCEPTION_TYPES = ['拒收', '无人接听', '地址错误', '货物破损', '其他'];

export default function SignPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const waybillId = params.waybillId as string;
  const modeParam = searchParams.get('mode');

  const [isException, setIsException] = useState(modeParam === 'exception');
  const [waybill, setWaybill] = useState<WaybillInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  // Normal sign state
  const [signType, setSignType] = useState<SignType>('signature');

  // Canvas signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Photo state
  const [photos, setPhotos] = useState<string[]>([]);

  // Proxy state
  const [proxyRelation, setProxyRelation] = useState('');
  const [proxyName, setProxyName] = useState('');

  // Exception state
  const [exceptionType, setExceptionType] = useState('');
  const [exceptionDesc, setExceptionDesc] = useState('');
  const [exceptionPhotos, setExceptionPhotos] = useState<string[]>([]);

  const fetchWaybill = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/waybills/${waybillId}`);
      if (!res.ok) throw new Error('获取运单信息失败');
      const data = await res.json();
      setWaybill(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [waybillId]);

  useEffect(() => {
    fetchWaybill();
  }, [fetchWaybill]);

  // Canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isException) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isException, signType]);

  const getCanvasPos = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getCanvasPos(e, canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    lastPos.current = pos;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getCanvasPos(e, canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasSignature(true);
  };

  const stopDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
  };

  const getSignatureDataUrl = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return null;
    return canvas.toDataURL('image/png');
  };

  // Photo handlers
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 3 - photos.length;
    const newFiles = Array.from(files).slice(0, remaining);

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleExceptionPhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 3 - exceptionPhotos.length;
    const newFiles = Array.from(files).slice(0, remaining);

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setExceptionPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExceptionPhoto = (index: number) => {
    setExceptionPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit normal sign
  const handleNormalSign = async () => {
    setSubmitting(true);
    try {
      let body: Record<string, unknown> = {};

      if (signType === 'signature') {
        const sig = getSignatureDataUrl();
        if (!sig) {
          alert('请先在签名区签名');
          setSubmitting(false);
          return;
        }
        body = { type: 'signature', signature: sig };
      } else if (signType === 'photo') {
        if (photos.length === 0) {
          alert('请至少拍摄一张签收照片');
          setSubmitting(false);
          return;
        }
        body = { type: 'photo', photos };
      } else if (signType === 'proxy') {
        if (!proxyRelation || !proxyName.trim()) {
          alert('请选择代收关系并填写代收人姓名');
          setSubmitting(false);
          return;
        }
        body = {
          type: 'proxy',
          proxyRelation,
          proxyName: proxyName.trim(),
        };
      }

      const res = await fetch(`/api/sign/${waybillId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || '签收提交失败');
      }

      setSuccess('签收成功');
      setTimeout(() => {
        router.push('/tasks');
      }, 1500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit exception
  const handleExceptionSubmit = async () => {
    if (!exceptionType) {
      alert('请选择异常类型');
      return;
    }
    if (!exceptionDesc.trim()) {
      alert('请填写异常描述');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/exception/${waybillId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: exceptionType,
          description: exceptionDesc.trim(),
          photos: exceptionPhotos,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || '异常上报失败');
      }

      setSuccess('异常上报成功');
      setTimeout(() => {
        router.push('/tasks');
      }, 1500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#07C160] rounded-full animate-spin" />
          <p className="text-gray-500 text-base">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !waybill) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="text-5xl mb-4">😢</div>
        <p className="text-gray-600 text-lg mb-4 text-center">{error || '运单不存在'}</p>
        <button
          onClick={fetchWaybill}
          className="px-8 py-3 bg-[#07C160] text-white text-lg rounded-xl font-medium"
        >
          重试
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="text-6xl mb-4">✅</div>
        <p className="text-xl font-bold text-[#07C160] mb-2">{success}</p>
        <p className="text-gray-500 text-base">正在返回任务列表...</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* 运单信息摘要 */}
      <div className="bg-white mx-4 mt-4 rounded-xl shadow-sm p-4">
        <p className="text-xs text-gray-400 mb-2">运单号</p>
        <p className="text-lg font-bold text-gray-900 mb-2">{waybill.waybillNo}</p>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{waybill.receiverName}</span>
          <span>{waybill.packageCount}件</span>
        </div>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {waybill.receiverAddress}
        </p>
      </div>

      {/* 模式切换 */}
      <div className="mx-4 mt-4 flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setIsException(false)}
          className={cn(
            'flex-1 h-11 rounded-lg text-base font-medium transition-colors',
            !isException
              ? 'bg-white text-[#07C160] shadow-sm'
              : 'text-gray-500',
          )}
        >
          正常签收
        </button>
        <button
          onClick={() => setIsException(true)}
          className={cn(
            'flex-1 h-11 rounded-lg text-base font-medium transition-colors',
            isException
              ? 'bg-white text-[#F5222D] shadow-sm'
              : 'text-gray-500',
          )}
        >
          异常上报
        </button>
      </div>

      {/* ==================== 正常签收 ==================== */}
      {!isException && (
        <>
          {/* 签收方式 Tab */}
          <div className="mx-4 mt-4 flex bg-gray-100 rounded-xl p-1">
            {[
              { key: 'signature', label: '电子签名' },
              { key: 'photo', label: '拍照签收' },
              { key: 'proxy', label: '代收签收' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSignType(tab.key as SignType)}
                className={cn(
                  'flex-1 h-10 rounded-lg text-sm font-medium transition-colors',
                  signType === tab.key
                    ? 'bg-white text-[#07C160] shadow-sm'
                    : 'text-gray-500',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 电子签名 */}
          {signType === 'signature' && (
            <div className="mx-4 mt-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500 mb-3">
                  请在下方空白区域签名
                </p>
                <div
                  className="relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50"
                  style={{ height: 220, touchAction: 'none' }}
                >
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full rounded-xl"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                </div>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={clearSignature}
                    className="flex-1 h-12 rounded-lg border border-gray-300 text-gray-600 text-base font-medium active:bg-gray-100"
                  >
                    清除
                  </button>
                  <button
                    onClick={handleNormalSign}
                    disabled={submitting || !hasSignature}
                    className={cn(
                      'flex-1 h-12 rounded-lg text-white text-base font-bold flex items-center justify-center gap-2',
                      submitting || !hasSignature
                        ? 'bg-green-300'
                        : 'bg-[#07C160] active:bg-green-600',
                    )}
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        提交中...
                      </>
                    ) : (
                      '确认签收'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 拍照签收 */}
          {signType === 'photo' && (
            <div className="mx-4 mt-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500 mb-3">
                  拍摄签收凭证（最多3张）
                </p>

                {/* 照片预览 */}
                {photos.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {photos.map((photo, i) => (
                      <div key={i} className="relative">
                        <img
                          src={photo}
                          alt={`签收照片 ${i + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => removePhoto(i)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 拍照按钮 */}
                {photos.length < 3 && (
                  <label className="flex items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 cursor-pointer active:bg-gray-100">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">📷</span>
                      <span className="text-sm text-gray-500">点击拍照</span>
                    </div>
                  </label>
                )}

                <button
                  onClick={handleNormalSign}
                  disabled={submitting || photos.length === 0}
                  className={cn(
                    'w-full h-12 rounded-lg text-white text-base font-bold flex items-center justify-center gap-2 mt-4',
                    submitting || photos.length === 0
                      ? 'bg-green-300'
                      : 'bg-[#07C160] active:bg-green-600',
                  )}
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      提交中...
                    </>
                  ) : (
                    '确认签收'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 代收签收 */}
          {signType === 'proxy' && (
            <div className="mx-4 mt-4">
              <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
                {/* 代收关系 */}
                <div>
                  <label className="text-sm text-gray-500 block mb-2">
                    代收关系
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PROXY_RELATIONS.map((rel) => (
                      <button
                        key={rel}
                        onClick={() => setProxyRelation(rel)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                          proxyRelation === rel
                            ? 'border-[#07C160] bg-green-50 text-[#07C160]'
                            : 'border-gray-200 text-gray-600 active:bg-gray-100',
                        )}
                      >
                        {rel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 代收人姓名 */}
                <div>
                  <label className="text-sm text-gray-500 block mb-2">
                    代收人姓名
                  </label>
                  <input
                    type="text"
                    value={proxyName}
                    onChange={(e) => setProxyName(e.target.value)}
                    placeholder="请输入代收人姓名"
                    className="w-full h-12 px-4 rounded-lg border border-gray-200 text-base focus:border-[#07C160] focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleNormalSign}
                  disabled={
                    submitting || !proxyRelation || !proxyName.trim()
                  }
                  className={cn(
                    'w-full h-12 rounded-lg text-white text-base font-bold flex items-center justify-center gap-2',
                    submitting || !proxyRelation || !proxyName.trim()
                      ? 'bg-green-300'
                      : 'bg-[#07C160] active:bg-green-600',
                  )}
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      提交中...
                    </>
                  ) : (
                    '确认签收'
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================== 异常上报 ==================== */}
      {isException && (
        <div className="mx-4 mt-4">
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            {/* 异常类型 */}
            <div>
              <label className="text-sm text-gray-500 block mb-2">
                异常类型
              </label>
              <div className="flex flex-wrap gap-2">
                {EXCEPTION_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setExceptionType(type)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                      exceptionType === type
                        ? 'border-[#F5222D] bg-red-50 text-[#F5222D]'
                        : 'border-gray-200 text-gray-600 active:bg-gray-100',
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* 异常照片 */}
            <div>
              <label className="text-sm text-gray-500 block mb-2">
                异常照片（可选，最多3张）
              </label>
              {exceptionPhotos.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {exceptionPhotos.map((photo, i) => (
                    <div key={i} className="relative">
                      <img
                        src={photo}
                        alt={`异常照片 ${i + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={() => removeExceptionPhoto(i)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {exceptionPhotos.length < 3 && (
                <label className="flex items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 cursor-pointer active:bg-gray-100">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleExceptionPhotoCapture}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">📷</span>
                    <span className="text-sm text-gray-500">点击拍照</span>
                  </div>
                </label>
              )}
            </div>

            {/* 异常描述 */}
            <div>
              <label className="text-sm text-gray-500 block mb-2">
                异常描述
              </label>
              <textarea
                value={exceptionDesc}
                onChange={(e) => setExceptionDesc(e.target.value)}
                placeholder="请详细描述异常情况..."
                rows={4}
                className="w-full p-4 rounded-lg border border-gray-200 text-base focus:border-[#F5222D] focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleExceptionSubmit}
              disabled={submitting || !exceptionType || !exceptionDesc.trim()}
              className={cn(
                'w-full h-12 rounded-lg text-white text-base font-bold flex items-center justify-center gap-2',
                submitting || !exceptionType || !exceptionDesc.trim()
                  ? 'bg-red-300'
                  : 'bg-[#F5222D] active:bg-red-700',
              )}
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  提交中...
                </>
              ) : (
                '提交异常'
              )}
            </button>
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
