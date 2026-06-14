import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await transporter.sendMail({
    from: `"MusicHub" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Recuperar contraseña — MusicHub',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#121212;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:#1DB954;padding:24px;text-align:center;">
          <h1 style="margin:0;font-size:24px;color:#000;">🎵 MusicHub</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="font-size:20px;margin-top:0;">Recuperar contraseña</h2>
          <p style="color:#b3b3b3;line-height:1.6;">
            Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva contraseña:
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetUrl}" style="background:#1DB954;color:#000;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:16px;">
              Restablecer contraseña
            </a>
          </div>
          <p style="color:#b3b3b3;font-size:13px;line-height:1.6;">
            Este enlace expira en <strong style="color:#fff;">1 hora</strong>.<br/>
            Si no solicitaste recuperar tu contraseña, ignora este correo.
          </p>
          <hr style="border:none;border-top:1px solid #282828;margin:24px 0;" />
          <p style="color:#535353;font-size:12px;text-align:center;">MusicHub — Tu música, en todas partes</p>
        </div>
      </div>
    `,
  })
}
