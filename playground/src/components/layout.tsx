import Head from "next/head";
import { Toaster } from "react-hot-toast";
import React from "react";

export const siteTitle = "Whisper Turbo";

type LayoutProps = {
    children: React.ReactNode;
    title: string;
};

export default function Layout(props: LayoutProps) {
    return (
        <div
            className="flex h-full min-h-screen bg-sky-500 -z-20 antialiased"
            style={{
                backgroundColor: "#25231F",
            }}
        >
            <Head>
                <title>{props.title}</title>
                <meta property="og:title" content={props.title} />
                <meta name="description" content="Transcribe any audio file - completely free!" /> 
                <meta
                    property="og:description"
                    content="Transcribe any audio file - completely free!"
                />
            </Head>
            <main className="flex flex-1 flex-col">
                <Toaster />
                <div className="flex-1">{props.children}</div>
            </main>
        </div>
    );
}
