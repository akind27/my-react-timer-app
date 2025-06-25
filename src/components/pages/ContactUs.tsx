import React from 'react';

const ContactUs: React.FC = () => {
  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '20px', lineHeight: '1.6', fontSize: '1rem' }}>
      <h1>Contact Us</h1>
      <p>If you have any questions, feedback, or need support regarding Online Timers, please don't hesitate to reach out to us.</p>
      <p>You can contact us directly via email at:</p>
      <p><strong><a href="mailto:contact@onlinetimers.cloud">contact@onlinetimers.cloud</a></strong></p>
      <p>We aim to respond to all inquiries as quickly as possible.</p>
    </div>
  );
};

export default ContactUs;