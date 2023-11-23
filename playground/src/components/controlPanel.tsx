import { useState, useRef, useEffect } from "react";
import {
    AvailableModels,
    InferenceSession,
    SessionManager,
    Segment,
    DecodingOptionsBuilder,
    initialize,
    Task
} from "whisper-turbo";
import toast from "react-hot-toast";
import { humanFileSize } from "../util";
import ProgressBar from "./progressBar";
import ModelSelector from "./modelSelector";
import GearIcon from "./gearIcon";
import ConfigModal, { ConfigOptions } from "./configModal";

export interface Transcript {
    segments: Array<Segment>;
}

interface AudioMetadata {
    file: File;
    fromMic: boolean;
}

interface ControlPanelProps {
    transcript: Transcript;
    setTranscript: React.Dispatch<React.SetStateAction<Transcript>>;
    setDownloadAvailable: React.Dispatch<React.SetStateAction<boolean>>;
}

const ControlPanel = (props: ControlPanelProps) => {
    const session = useRef<InferenceSession | null>(null);
    const [selectedModel, setSelectedModel] = useState<AvailableModels | null>(
        null
    );
    const [modelLoading, setModelLoading] = useState<boolean>(false);
    const [loadedModel, setLoadedModel] = useState<AvailableModels | null>(
        null
    );
    const [audioData, setAudioData] = useState<Uint8Array | null>(null);
    const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(
        null
    );
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loaded, setLoaded] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [transcribing, setTranscribing] = useState<boolean>(false);
    const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
    const [configOptions, setConfigOptions] = useState<ConfigOptions>({
        language: 'zh',
        task: Task.Transcribe,
        suppress_non_speech: true,
    });

    useEffect(() => {
        if (loadedModel && selectedModel != loadedModel && !transcribing) {
            setLoaded(false);
            setProgress(0);
        }
    }, [selectedModel]);

    const handleAudioFile = () => async (event: any) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setAudioData(new Uint8Array(reader.result as ArrayBuffer));
            setAudioMetadata({
                file: file,
                fromMic: false,
            });
            setBlobUrl(URL.createObjectURL(file));
        };
        reader.readAsArrayBuffer(file);
    };

    const loadModel = async () => {
        if (session.current) {
            session.current.destroy();
        }
        if (modelLoading) {
            return;
        }
        if (!selectedModel) {
            console.error("No model selected");
            return;
        }
        setModelLoading(true);

        const manager = new SessionManager();
        const loadResult = await manager.loadModel(
            selectedModel,
            () => {
                setLoaded(true);
                setLoadedModel(selectedModel);
            },
            (p: number) => setProgress(p)
        );
        if (loadResult.isErr) {
            toast.error(loadResult.error.message);
        } else {
            setModelLoading(false);
            session.current = loadResult.value;
        }
    };

    const runSession = async () => {
        if (!session.current) {
            toast.error("No model loaded");
            return;
        }
        if (!audioData) {
            toast.error("No audio file loaded");
            return;
        }
        props.setTranscript((transcript: Transcript) => {
            return {
                ...transcript,
                segments: [],
            };
        });
        setTranscribing(true);
        props.setDownloadAvailable(false);
        await initialize();
        let builder = new DecodingOptionsBuilder();
        if (configOptions.language)
            builder = builder.setLanguage(configOptions.language);
        if (configOptions.suppress_non_speech)
            builder = builder.setSuppressTokens(Int32Array.from([-1]));
        else
            builder = builder.setSuppressTokens(Int32Array.from([]));

        builder = builder.setTask(configOptions.task);
        builder = builder.setPrompt("呃，就是就是一段嘛简简体普通话呢，然后啊然后夹杂部分word吧，哎，哈哈哈，嗯。");
        // builder = builder.setTemperature(0.0);
        const options = builder.build();
        console.log("Options: ", options);

        await session.current.transcribe(
            audioData!,
            audioMetadata!.fromMic,
            options,
            (s: Segment) => {
                console.log(s);
                if (s.last) {
                    setTranscribing(false);
                    props.setDownloadAvailable(true);
                    return;
                }
                props.setTranscript((transcript: Transcript) => {
                    return {
                        ...transcript,
                        segments: [...transcript.segments, s],
                    };
                });
            }
        );
    };

    return (
        <>
            <ConfigModal
                isModalOpen={isConfigOpen}
                setIsModalOpen={setIsConfigOpen}
                configOptions={configOptions}
                setConfigOptions={setConfigOptions}
            />
            <div className="flex-1 w-1/2 h-full flex flex-col relative z-10 overflow-hidden">
                <div className="h-full px-4 xl:pl-32 my-4">
                    <div className="flex flex-col mx-auto gap-6">
                        <div>
                            <ModelSelector
                                selectedModel={selectedModel}
                                setSelectedModel={setSelectedModel}
                                loaded={loaded}
                                progress={progress}
                            />
                            <ProgressBar progress={progress} loaded={loaded} />
                            {selectedModel != loadedModel && progress == 0 && (
                                <div className="flex flex-row justify-end">
                                    <button
                                        className="outline text-white text-2xl font-semibold mt-2 px-3 bg-pop-orange"
                                        onClick={loadModel}
                                    >
                                        {modelLoading ? "Loading..." : "Load"}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-row gap-4">
                            <div className="flex flex-col w-full">
                                <label className="text-white text-xl font-semibold">
                                    Upload Audio
                                </label>
                                <label
                                    className="bg-pop-orange text-xl outline outline-white w-full text-white font-semibold py-2.5 px-8 mx-auto cursor-pointer w-full"
                                    htmlFor="audioFile"
                                >
                                    <div className="flex flex-row justify-between">
                                        <span className="">
                                            {audioData && audioMetadata
                                                ? audioMetadata.file.name
                                                : `Select Audio File`}
                                        </span>
                                        <span className="my-auto">
                                            {audioData
                                                ? humanFileSize(
                                                      audioData.length
                                                  )
                                                : ""}
                                        </span>
                                    </div>
                                </label>
                                <input
                                    type="file"
                                    className="hidden"
                                    name="audioFile"
                                    id="audioFile"
                                    onChange={handleAudioFile()}
                                    accept=".wav,.aac,.m4a,.mp3"
                                />
                            </div>
                        </div>
                        {blobUrl && (
                            <div>
                                <label className="text-white text-xl font-semibold">
                                    Your Audio
                                </label>
                                <audio
                                    controls
                                    id="audioPlayer"
                                    key={blobUrl}
                                    className="mx-auto w-full"
                                >
                                    <source
                                        key={blobUrl}
                                        src={blobUrl}
                                        type="audio/wav"
                                    />
                                </audio>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-row pt-8 mx-auto justify-center gap-x-6">
                        <button
                            className="bg-pop-orange text-2xl outline outline-white text-white font-semibold py-3 px-8 cursor-pointer active:bg-pop-orange-dark"
                            onClick={runSession}
                            disabled={transcribing}
                        >
                            {transcribing ? (
                                <div className="flex p-4">
                                    <span className="loader"></span>
                                </div>
                            ) : (
                                "Transcribe"
                            )}
                        </button>

                        <button
                            className="bg-pop-orange text-2xl outline outline-white text-white font-semibold py-1 px-4 cursor-pointer active:bg-pop-orange-dark"
                            onClick={() => setIsConfigOpen(true)}
                        >
                            <GearIcon />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ControlPanel;
