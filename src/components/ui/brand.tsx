import Image from 'next/image';
import { business } from '@/config/business';

export function Brand({ name = business.name, small = false }: { name?: string; small?: boolean }) {
  return <span className={`brand-lockup inline-flex items-center gap-[13px] text-[1.05rem] leading-[1.3] font-extrabold tracking-[-.045em] [overflow-wrap:anywhere] ${small ? 'small gap-2.5 text-sm' : ''}`}>
    <span className={`brand-mark grid shrink-0 place-items-center rounded bg-white ${small ? 'size-9' : 'size-11 max-[600px]:size-[38px]'}`} aria-hidden="true"><Image className="block size-full rounded-[3px] object-cover" src={business.logo} alt="" width={46} height={52} /></span>
    <span>{name}</span>
  </span>;
}
