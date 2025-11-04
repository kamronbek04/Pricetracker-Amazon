'use client';

import { FormEvent, Fragment, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import Image from 'next/image';
import { addUserEmailToProduct } from '@/lib/actions';

interface Props {
  productId: string;
}

const Modal = ({ productId }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    await addUserEmailToProduct(productId, email);

    setIsSubmitting(false);
    setEmail('');
    closeModal();
  };

  return (
    <>
      <button className="btn" type="button" onClick={openModal}>
        Open dialog
      </button>
      <Dialog
        className="dialog-container"
        as="div"
        open={isOpen}
        onClose={closeModal}
      >
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="dialog-content">
            <DialogTitle className="font-bold">
              <div className="flex justify-between">
                <div className="p-3 border border-gray-200 rounded-10">
                  <Image
                    src="/assets/icons/logo.svg"
                    alt="logo"
                    width={28}
                    height={28}
                  />
                </div>

                <Image
                  src="/assets/icons/x-close.svg"
                  alt="close"
                  width={24}
                  height={24}
                  className="cursor-pointer"
                  onClick={closeModal}
                />
              </div>
            </DialogTitle>
            <h4 className="dialog-head_text">
              Stay updated with product pricing alerts right in your inbox!
            </h4>

            <p className="text-sm text-gray-600 mt-2">
              Never miss a bargain again with our timely alerts!
            </p>
            <form className="flex flex-col mt-5" onSubmit={handleSubmit}>
              <label
                className="text-sm font-medium text-gry-700"
                htmlFor="email"
              >
                Email Address
              </label>
              <div className="dialog-input_container">
                <Image
                  src="/assets/icons/mail.svg"
                  alt="mail"
                  width={18}
                  height={18}
                />

                <input
                  required
                  type="email"
                  id="email"
                  value={email}
                  className="dialog-input"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                />
              </div>
              <button type="submit" className="dialog-btn">
                {isSubmitting ? 'Submitting...' : 'Track'}
              </button>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
};

export default Modal;
