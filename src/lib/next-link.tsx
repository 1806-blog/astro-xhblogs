import React from 'react';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children?: React.ReactNode;
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
  shallow?: boolean;
  locale?: string | false;
  legacyBehavior?: boolean;
  passHref?: boolean;
};

/**
 * next/link 的 Astro 垫片。
 * 原项目的 11 个组件都只用到 href / className / children / 少量原生属性，
 * 这里统一降级成 <a>，行为对等于 Next 的客户端跳转（多一次整页刷新）。
 */
export default function Link({
  href,
  children,
  prefetch,
  scroll,
  replace,
  shallow,
  locale,
  legacyBehavior,
  passHref,
  ...rest
}: LinkProps) {
  void prefetch;
  void scroll;
  void replace;
  void shallow;
  void locale;
  void legacyBehavior;
  void passHref;

  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
