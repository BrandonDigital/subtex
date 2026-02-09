"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitContactForm } from "@/server/actions/contact";

interface ContactFormProps {
  showCard?: boolean;
  title?: string;
  description?: string;
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export function ContactForm({
  showCard = true,
  title = "Contact Us",
  description = "Have questions about our ACM sheets? Send us a message and we'll get back to you as soon as possible.",
  initialName = "",
  initialEmail = "",
  initialPhone = "",
}: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: initialName,
    email: initialEmail,
    phone: initialPhone,
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitContactForm({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        message: formData.message,
      });

      if (!result.success) {
        setError(result.error || "Failed to send message. Please try again.");
        return;
      }

      setIsSuccess(true);
      setFormData({ name: "", email: "", phone: "", message: "" });
      // Reset success message after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000);
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='name'>Name *</Label>
          <Input
            id='name'
            name='name'
            placeholder='Your name'
            value={formData.name}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='email'>Email *</Label>
          <Input
            id='email'
            name='email'
            type='email'
            placeholder='your@email.com'
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='phone'>Phone</Label>
        <Input
          id='phone'
          name='phone'
          type='tel'
          placeholder='04XX XXX XXX'
          value={formData.phone}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='message'>Message *</Label>
        <Textarea
          id='message'
          name='message'
          placeholder='Tell us about your project or ask us a question...'
          rows={5}
          value={formData.message}
          onChange={handleChange}
          required
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <div className='text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md'>
          {error}
        </div>
      )}

      {isSuccess && (
        <div className='text-sm text-green-600 bg-green-100 px-4 py-2 rounded-md'>
          Thank you for your message! We&apos;ll be in touch soon.
        </div>
      )}

      <div className='flex justify-end'>
        <Button
          type='submit'
          size='lg'
          disabled={isSubmitting}
          className='w-full sm:w-auto'
        >
          {isSubmitting ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Sending...
            </>
          ) : (
            <>
              <Send className='mr-2 h-4 w-4' />
              Send Message
            </>
          )}
        </Button>
      </div>
    </form>
  );

  if (!showCard) {
    return formContent;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
