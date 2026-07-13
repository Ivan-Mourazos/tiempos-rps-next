/** @type {import('next').NextConfig} */
const securityHeaders = [
    { key: 'Content-Security-Policy', value: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'" },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
    { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
];

const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    allowedDevOrigins: ['192.168.4.90'],
    async headers() {
        return [
            {
                source: '/:path*',
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;
